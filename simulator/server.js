/**
 * server.js - Zero-dependency simulated BLE GATT Peripheral & Web Bridge
 *
 * Runs a simulated BLE peripheral, exposes GATT services (Battery, Heart Rate,
 * Control Point), streams live notifications, and serves the Web Client & Explainer.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { TelemetryEngine } = require('./telemetry');

class SimulatedGattServer {
  constructor(options = {}) {
    this.port = options.port || 3333;
    this.telemetry = new TelemetryEngine();
    this.connected = false;
    this.state = 'ADVERTISING'; // STANDBY, ADVERTISING, CONNECTED
    this.mtu = 23;
    this.deviceName = 'PulseGlow BLE';
    this.advertisingIntervalMs = 100;
    this.connectionIntervalMs = 20;

    // Simulated Peripheral State
    this.batteryLevel = 92;
    this.targetBpm = 74;
    this.workoutMode = 0; // 0=Resting, 1=Cardio, 2=Sprint
    this.sensorLocation = 1; // 1 = Chest, 2 = Wrist

    // Notifications subscriptions
    this.subscriptions = {
      battery: false,
      heartRate: false
    };

    this.sseClients = new Set();
    this.heartRateTimer = null;
    this.batteryTimer = null;

    // Build GATT Database Structure
    this.gattDb = {
      device: {
        name: this.deviceName,
        address: 'D4:36:39:AA:BB:CC',
        txPowerDbm: 4
      },
      services: [
        {
          uuid: '00001800-0000-1000-8000-00805f9b34fb',
          name: 'Generic Access',
          shortUuid: '0x1800',
          characteristics: [
            {
              uuid: '00002a00-0000-1000-8000-00805f9b34fb',
              shortUuid: '0x2A00',
              name: 'Device Name',
              properties: ['READ'],
              value: Buffer.from(this.deviceName, 'utf-8')
            },
            {
              uuid: '00002a01-0000-1000-8000-00805f9b34fb',
              shortUuid: '0x2A01',
              name: 'Appearance',
              properties: ['READ'],
              value: Buffer.from([0x40, 0x03]) // Generic Heart Rate Sensor
            }
          ]
        },
        {
          uuid: '0000180f-0000-1000-8000-00805f9b34fb',
          name: 'Battery Service',
          shortUuid: '0x180F',
          characteristics: [
            {
              uuid: '00002a19-0000-1000-8000-00805f9b34fb',
              shortUuid: '0x2A19',
              name: 'Battery Level',
              properties: ['READ', 'NOTIFY'],
              descriptors: [
                { uuid: '0x2902', name: 'Client Characteristic Configuration Descriptor (CCCD)', value: [0x00, 0x00] }
              ],
              getValue: () => Buffer.from([this.batteryLevel])
            }
          ]
        },
        {
          uuid: '0000180d-0000-1000-8000-00805f9b34fb',
          name: 'Heart Rate Service',
          shortUuid: '0x180D',
          characteristics: [
            {
              uuid: '00002a37-0000-1000-8000-00805f9b34fb',
              shortUuid: '0x2A37',
              name: 'Heart Rate Measurement',
              properties: ['NOTIFY'],
              descriptors: [
                { uuid: '0x2902', name: 'Client Characteristic Configuration Descriptor (CCCD)', value: [0x00, 0x00] }
              ]
            },
            {
              uuid: '00002a38-0000-1000-8000-00805f9b34fb',
              shortUuid: '0x2A38',
              name: 'Body Sensor Location',
              properties: ['READ'],
              getValue: () => Buffer.from([this.sensorLocation])
            },
            {
              uuid: '00002a39-0000-1000-8000-00805f9b34fb',
              shortUuid: '0x2A39',
              name: 'Heart Rate Control Point',
              properties: ['WRITE'],
              onWrite: (val) => this.handleHeartRateControl(val)
            }
          ]
        },
        {
          uuid: '0000fff0-0000-1000-8000-00805f9b34fb',
          name: 'Custom Simulator Control Service',
          shortUuid: '0xFFF0',
          characteristics: [
            {
              uuid: '0000fff1-0000-1000-8000-00805f9b34fb',
              shortUuid: '0xFFF1',
              name: 'Workout Mode / Stress Control',
              properties: ['READ', 'WRITE'],
              getValue: () => Buffer.from([this.workoutMode]),
              onWrite: (val) => this.handleModeControl(val)
            }
          ]
        }
      ]
    };
  }

  handleHeartRateControl(buffer) {
    const cmd = buffer[0];
    if (cmd === 1) {
      console.log('[GATT] Reset Energy Expended requested via Control Point 0x2A39');
      this.telemetry.logEvent('CONTROL_POINT_WRITE', { command: 'RESET_ENERGY_EXPENDED', rawByte: cmd });
      return true;
    }
    return false;
  }

  handleModeControl(buffer) {
    const mode = buffer[0];
    this.workoutMode = mode;
    if (mode === 0) this.targetBpm = 72; // Resting
    else if (mode === 1) this.targetBpm = 125; // Cardio
    else if (mode === 2) this.targetBpm = 168; // Sprint
    else this.targetBpm = 85;

    console.log(`[GATT] Workout mode updated to ${mode} (Target BPM: ${this.targetBpm})`);
    this.telemetry.logEvent('MODE_CHANGE', { workoutMode: mode, targetBpm: this.targetBpm });
    return true;
  }

  connect() {
    this.connected = true;
    this.state = 'CONNECTED';
    console.log('[GAP] Peripheral transitioned to CONNECTED state');
    this.telemetry.logEvent('GAP_CONNECT', {
      peer: 'Browser Web Client',
      role: 'Peripheral',
      connectionIntervalMs: this.connectionIntervalMs,
      mtu: this.mtu
    });
    this.broadcastSse('gap_state', { state: this.state, connected: true });
  }

  disconnect() {
    this.connected = false;
    this.state = 'ADVERTISING';
    this.subscriptions.heartRate = false;
    this.subscriptions.battery = false;
    this.stopHeartRateStreaming();
    console.log('[GAP] Peripheral transitioned back to ADVERTISING state');
    this.telemetry.logEvent('GAP_DISCONNECT', { reason: 'User Initiated' });
    this.broadcastSse('gap_state', { state: this.state, connected: false });
  }

  setSubscription(charUuid, enabled) {
    const norm = charUuid.toUpperCase();
    if (norm.includes('2A37')) {
      this.subscriptions.heartRate = enabled;
      console.log(`[GATT CCCD] Heart Rate notifications ${enabled ? 'ENABLED' : 'DISABLED'}`);
      if (enabled) {
        this.startHeartRateStreaming();
      } else {
        this.stopHeartRateStreaming();
      }
      this.telemetry.logEvent('CCCD_UPDATE', { characteristic: '0x2A37', notificationsEnabled: enabled });
      return true;
    }
    if (norm.includes('2A19')) {
      this.subscriptions.battery = enabled;
      console.log(`[GATT CCCD] Battery notifications ${enabled ? 'ENABLED' : 'DISABLED'}`);
      this.telemetry.logEvent('CCCD_UPDATE', { characteristic: '0x2A19', notificationsEnabled: enabled });
      return true;
    }
    return false;
  }

  startHeartRateStreaming() {
    if (this.heartRateTimer) clearInterval(this.heartRateTimer);
    this.heartRateTimer = setInterval(() => {
      if (!this.connected || !this.subscriptions.heartRate) return;

      // Realistic pulse variation around target
      const sway = (Math.random() - 0.5) * 3.5;
      const currentBpm = Math.round(this.targetBpm + sway);
      const rrIntervalMs = Math.round((60000 / currentBpm) * 1.024);

      // Construct BLE Heart Rate Measurement payload (0x2A37)
      // Flags: Bit 0 = 0 (uint8 BPM), Bit 1-2 = 11 (sensor contact detected), Bit 4 = 1 (RR present)
      const flags = 0x16; // 0b00010110
      const rrLow = rrIntervalMs & 0xFF;
      const rrHigh = (rrIntervalMs >> 8) & 0xFF;
      const payload = Buffer.from([flags, currentBpm, rrLow, rrHigh]);

      const logEntry = this.telemetry.logEvent('HEART_RATE_MEASUREMENT', {
        bpm: currentBpm,
        rrIntervalMs,
        rawHex: payload.toString('hex').toUpperCase()
      });

      this.broadcastSse('heart_rate', {
        bpm: currentBpm,
        rrIntervalMs,
        rawHex: payload.toString('hex').toUpperCase(),
        timestamp: Date.now(),
        rssi: logEntry.rssi,
        interArrivalMs: logEntry.interArrivalMs,
        jitterMs: logEntry.jitterMs
      });
    }, 1000);
  }

  stopHeartRateStreaming() {
    if (this.heartRateTimer) {
      clearInterval(this.heartRateTimer);
      this.heartRateTimer = null;
    }
  }

  broadcastSse(eventName, data) {
    const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(message);
      } catch (err) {
        this.sseClients.delete(client);
      }
    }
  }

  start() {
    const server = http.createServer((req, res) => {
      // CORS headers for local web client
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = parsedUrl.pathname;

      // API Endpoints
      if (pathname === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          deviceName: this.deviceName,
          state: this.state,
          connected: this.connected,
          mtu: this.mtu,
          batteryLevel: this.batteryLevel,
          workoutMode: this.workoutMode,
          subscriptions: this.subscriptions,
          connectionIntervalMs: this.connectionIntervalMs
        }));
        return;
      }

      if (pathname === '/api/connect' && req.method === 'POST') {
        this.connect();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, state: this.state }));
        return;
      }

      if (pathname === '/api/disconnect' && req.method === 'POST') {
        this.disconnect();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, state: this.state }));
        return;
      }

      if (pathname === '/api/services') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const summary = this.gattDb.services.map(s => ({
          uuid: s.uuid,
          shortUuid: s.shortUuid,
          name: s.name,
          characteristics: s.characteristics.map(c => ({
            uuid: c.uuid,
            shortUuid: c.shortUuid,
            name: c.name,
            properties: c.properties,
            descriptors: c.descriptors || []
          }))
        }));
        res.end(JSON.stringify(summary));
        return;
      }

      if (pathname === '/api/gatt/read') {
        const uuid = (parsedUrl.searchParams.get('uuid') || '').toUpperCase();
        if (uuid.includes('2A19')) { // Battery
          const buf = Buffer.from([this.batteryLevel]);
          this.telemetry.logEvent('GATT_READ', { characteristic: '0x2A19 (Battery)', value: this.batteryLevel });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ uuid: '0x2A19', name: 'Battery Level', value: this.batteryLevel, rawHex: buf.toString('hex') }));
          return;
        }
        if (uuid.includes('2A38')) { // Sensor Location
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ uuid: '0x2A38', name: 'Body Sensor Location', value: this.sensorLocation, label: 'Chest' }));
          return;
        }
        if (uuid.includes('FFF1')) { // Mode
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ uuid: '0xFFF1', name: 'Workout Mode', value: this.workoutMode }));
          return;
        }
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Characteristic not found or not readable' }));
        return;
      }

      if (pathname === '/api/gatt/write' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const uuid = (data.uuid || '').toUpperCase();
            const val = parseInt(data.value, 10);

            if (uuid.includes('FFF1')) {
              this.handleModeControl(Buffer.from([val]));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, characteristic: '0xFFF1', value: val }));
              return;
            }
            if (uuid.includes('2A39')) {
              this.handleHeartRateControl(Buffer.from([val]));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, characteristic: '0x2A39', value: val }));
              return;
            }
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unknown or non-writable characteristic' }));
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }

      if (pathname === '/api/gatt/subscribe' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const ok = this.setSubscription(data.uuid || '0x2A37', !!data.enabled);
            res.writeHead(ok ? 200 : 400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: ok, uuid: data.uuid, enabled: !!data.enabled }));
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }

      if (pathname === '/api/telemetry') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.telemetry.getSnapshot()));
        return;
      }

      // Server-Sent Events (SSE) Stream
      if (pathname === '/api/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        res.write('retry: 2000\n\n');
        this.sseClients.add(res);

        // Send initial state
        res.write(`event: welcome\ndata: ${JSON.stringify({ message: 'Connected to BLE Peripheral Simulator', deviceName: this.deviceName })}\n\n`);

        req.on('close', () => {
          this.sseClients.delete(res);
        });
        return;
      }

      // Static File Serving
      this.serveStaticFile(pathname, res);
    });

    server.listen(this.port, () => {
      console.log(`\n======================================================`);
      console.log(`  BLUETOOTH LOW ENERGY (BLE) DEMYSTIFIED SIMULATOR`);
      console.log(`======================================================`);
      console.log(`  GATT Server listening at: http://localhost:${this.port}`);
      console.log(`  - Web Demo:      http://localhost:${this.port}/web/`);
      console.log(`  - Explainer:     http://localhost:${this.port}/explainer/`);
      console.log(`  - Telemetry API: http://localhost:${this.port}/api/telemetry`);
      console.log(`  - Live SSE:      http://localhost:${this.port}/api/events`);
      console.log(`======================================================\n`);
    });

    return server;
  }

  serveStaticFile(urlPath, res) {
    const rootDir = path.resolve(__dirname, '..');
    let filePath = path.join(rootDir, urlPath === '/' ? 'web/index.html' : urlPath);

    // Prevent directory traversal
    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end('Access Denied');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`File Not Found: ${urlPath}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.ico': 'image/x-icon',
      '.md': 'text/markdown; charset=utf-8'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  }
}

// Auto-start if executed directly
if (require.main === module) {
  const port = process.env.PORT || 3333;
  const sim = new SimulatedGattServer({ port });
  sim.start();
}

module.exports = { SimulatedGattServer };
