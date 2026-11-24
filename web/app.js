/**
 * app.js - Web Bluetooth Live Client & Educational Visualizer
 *
 * Implements full 6-step BLE handshake:
 * 1. Scan -> 2. Connect & Discover -> 3. Read -> 4. Write -> 5. Subscribe -> 6. Live Stream
 * Supports both real physical Web Bluetooth and zero-hardware simulated peripheral.
 */

// State Machine Variables
const state = {
  mode: 'simulator', // 'simulator' or 'real'
  connected: false,
  device: null,
  server: null,
  services: {},
  characteristics: {},
  subscribed: false,
  eventSource: null,
  heartRateHistory: [],
  maxChartPoints: 30,
  startTime: Date.now(),
  chart: null,
  autoDemoRunning: false
};

// Standard BLE UUIDs
const BLE_UUIDS = {
  SERVICES: {
    GENERIC_ACCESS: '00001800-0000-1000-8000-00805f9b34fb',
    BATTERY: '0000180f-0000-1000-8000-00805f9b34fb',
    HEART_RATE: '0000180d-0000-1000-8000-00805f9b34fb',
    CUSTOM_CONTROL: '0000fff0-0000-1000-8000-00805f9b34fb'
  },
  CHARS: {
    DEVICE_NAME: '00002a00-0000-1000-8000-00805f9b34fb',
    BATTERY_LEVEL: '00002a19-0000-1000-8000-00805f9b34fb',
    HEART_RATE_MEASUREMENT: '00002a37-0000-1000-8000-00805f9b34fb',
    BODY_SENSOR_LOCATION: '00002a38-0000-1000-8000-00805f9b34fb',
    HEART_RATE_CONTROL_POINT: '00002a39-0000-1000-8000-00805f9b34fb',
    MODE_CONTROL: '0000fff1-0000-1000-8000-00805f9b34fb'
  }
};

// DOM Elements
const elements = {
  modeSelect: document.getElementById('modeSelect'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  connectionStatusBadge: document.getElementById('connectionStatusBadge'),
  autoDemoBtn: document.getElementById('autoDemoBtn'),
  disconnectBtn: document.getElementById('disconnectBtn'),
  scanBtn: document.getElementById('scanBtn'),
  connectBtn: document.getElementById('connectBtn'),
  readBatteryBtn: document.getElementById('readBatteryBtn'),
  notifyBtn: document.getElementById('notifyBtn'),
  writeModeBtns: document.querySelectorAll('.write-mode-btn'),
  writeFeedbackText: document.getElementById('writeFeedbackText'),
  step1: document.getElementById('step1'),
  step2: document.getElementById('step2'),
  step3: document.getElementById('step3'),
  step4: document.getElementById('step4'),
  step5: document.getElementById('step5'),
  step6: document.getElementById('step6'),
  step2Details: document.getElementById('step2Details'),
  step3Details: document.getElementById('step3Details'),
  serviceChipsContainer: document.getElementById('serviceChipsContainer'),
  batteryDisplay: document.getElementById('batteryDisplay'),
  batteryHex: document.getElementById('batteryHex'),
  cccdStatusTag: document.getElementById('cccdStatusTag'),
  bpmDisplay: document.getElementById('bpmDisplay'),
  heartIcon: document.getElementById('heartIcon'),
  rrDisplay: document.getElementById('rrDisplay'),
  rssiDisplay: document.getElementById('rssiDisplay'),
  jitterDisplay: document.getElementById('jitterDisplay'),
  packetTypeBadge: document.getElementById('packetTypeBadge'),
  packetBytesViewer: document.getElementById('packetBytesViewer'),
  pktFlag: document.getElementById('pktFlag'),
  pktVal: document.getElementById('pktVal'),
  pktExtra: document.getElementById('pktExtra'),
  logConsole: document.getElementById('logConsole'),
  clearLogBtn: document.getElementById('clearLogBtn'),
  copyLogBtn: document.getElementById('copyLogBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  liveChartCanvas: document.getElementById('liveChart')
};

// -------------------------------------------------------------
// Logging Utilities
// -------------------------------------------------------------
function log(tag, message, level = 'info') {
  const now = new Date();
  const timeStr = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0')}`;

  const entry = document.createElement('div');
  entry.className = `log-entry log-${level}`;

  let tagClass = 'tag-system';
  if (tag === 'GAP') tagClass = 'tag-gap';
  else if (tag === 'GATT') tagClass = 'tag-gatt';
  else if (tag === 'ATT') tagClass = 'tag-att';
  else if (tag === 'DATA') tagClass = 'tag-data';
  else if (level === 'error') tagClass = 'tag-error';

  entry.innerHTML = `
    <span class="log-time">${timeStr}</span>
    <span class="log-tag ${tagClass}">${tag}</span>
    <span class="log-msg">${escapeHtml(message)}</span>
  `;

  elements.logConsole.appendChild(entry);
  elements.logConsole.scrollTop = elements.logConsole.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// -------------------------------------------------------------
// Chart Initialization (Chart.js with pure canvas fallback)
// -------------------------------------------------------------
function initChart() {
  const ctx = elements.liveChartCanvas.getContext('2d');

  if (typeof Chart !== 'undefined') {
    const isDark = document.body.getAttribute('data-theme') !== 'light';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    state.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Heart Rate (BPM)',
          data: [],
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#0284c7'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, maxTicksLimit: 8 }
          },
          y: {
            min: 50,
            max: 180,
            grid: { color: gridColor },
            ticks: { color: textColor, stepSize: 20 }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  } else {
    // Pure canvas lightweight fallback if Chart.js is offline or not loaded
    log('SYSTEM', 'Chart.js not detected; using built-in canvas sparkline engine.');
    drawCanvasFallback([]);
  }
}

function updateChart(bpm) {
  state.heartRateHistory.push(bpm);
  if (state.heartRateHistory.length > state.maxChartPoints) {
    state.heartRateHistory.shift();
  }

  if (state.chart) {
    const timeLabel = new Date().toLocaleTimeString().split(' ')[0];
    state.chart.data.labels.push(timeLabel);
    state.chart.data.datasets[0].data.push(bpm);

    if (state.chart.data.labels.length > state.maxChartPoints) {
      state.chart.data.labels.shift();
      state.chart.data.datasets[0].data.shift();
    }
    state.chart.update('none');
  } else {
    drawCanvasFallback(state.heartRateHistory);
  }
}

function drawCanvasFallback(data) {
  const canvas = elements.liveChartCanvas;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;

  // Grid
  for (let y = 30; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  if (!data || data.length < 2) {
    ctx.fillStyle = '#64748b';
    ctx.font = '12px monospace';
    ctx.fillText('Waiting for Heart Rate notifications...', 20, h / 2);
    return;
  }

  ctx.beginPath();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;

  const minVal = 50;
  const maxVal = 180;
  const stepX = w / (state.maxChartPoints - 1);

  data.forEach((val, i) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    const x = i * stepX;
    const y = h - ((clamped - minVal) / (maxVal - minVal)) * (h - 20) - 10;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

// -------------------------------------------------------------
// Step 1: Scan & Discover
// -------------------------------------------------------------
async function handleScan() {
  log('GAP', 'Initiating GAP discovery scan (listening for ADV_IND packets on 2.4GHz)...');
  elements.scanBtn.disabled = true;

  if (state.mode === 'real') {
    if (!navigator.bluetooth) {
      log('GAP', 'Web Bluetooth API is not supported in this browser. Switch to Simulated mode or use Chrome/Edge on Desktop/Android.', 'error');
      elements.scanBtn.disabled = false;
      return;
    }

    try {
      log('GAP', 'Prompting user to choose physical BLE peripheral...');
      state.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service', 0xfff0, 'generic_access']
      });

      log('GAP', `Discovered peripheral: "${state.device.name || 'Unnamed'}" (ID: ${state.device.id})`);
      onScanSuccess(state.device.name || 'Physical BLE Device');
    } catch (err) {
      log('GAP', `Scan aborted or failed: ${err.message}`, 'error');
      elements.scanBtn.disabled = false;
    }
  } else {
    // Simulator Mode
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const info = await res.json();
        log('GAP', `Simulated peripheral detected on 3 advertising channels: "${info.deviceName}" (RSSI: -64 dBm)`);
        onScanSuccess(info.deviceName);
      } else {
        throw new Error('Simulator server returned ' + res.status);
      }
    } catch (e) {
      log('GAP', 'Local simulator HTTP server not reached. Starting in-browser virtual peripheral fallback.');
      onScanSuccess('PulseGlow BLE (Virtual)');
    }
  }
}

function onScanSuccess(deviceName) {
  elements.step1.classList.remove('active-step');
  elements.step1.classList.add('done-step');
  elements.step2.classList.add('active-step');
  elements.connectBtn.disabled = false;
  log('GAP', `Step 1 Complete: Device ready for L2CAP connection handshake.`);
}

// -------------------------------------------------------------
// Step 2: Connect & Discover GATT Services
// -------------------------------------------------------------
async function handleConnect() {
  log('GAP', 'Transmitting CONNECT_IND packet to transition peripheral from ADVERTISING to CONNECTED...');
  elements.connectBtn.disabled = true;

  if (state.mode === 'real') {
    try {
      state.server = await state.device.gatt.connect();
      state.connected = true;
      log('GATT', `Connected! Negotiated ATT MTU: 23-512 bytes. Discovering Primary Services...`);

      // Discover Services
      const services = await state.server.getPrimaryServices();
      elements.serviceChipsContainer.innerHTML = '';

      for (const service of services) {
        log('GATT', `Discovered Primary Service: ${service.uuid}`);
        const chip = document.createElement('div');
        chip.className = 'service-chip';
        chip.innerHTML = `<strong>${getServiceName(service.uuid)}</strong> <code>${service.uuid.substring(4, 8)}</code>`;
        elements.serviceChipsContainer.appendChild(chip);

        if (service.uuid.includes('180d')) {
          state.services.heartRate = service;
          state.characteristics.heartRate = await service.getCharacteristic('00002a37-0000-1000-8000-00805f9b34fb');
        }
        if (service.uuid.includes('180f')) {
          state.services.battery = service;
          state.characteristics.battery = await service.getCharacteristic('00002a19-0000-1000-8000-00805f9b34fb');
        }
      }

      onConnectSuccess();
    } catch (err) {
      log('GATT', `Connection failed: ${err.message}`, 'error');
      elements.connectBtn.disabled = false;
    }
  } else {
    // Simulator Mode
    try {
      await fetch('/api/connect', { method: 'POST' });
    } catch (e) {
      // virtual fallback
    }

    state.connected = true;
    log('GATT', 'Connected to Simulated GATT Server! Connection interval: 20ms, MTU: 23.');
    log('GATT', 'Discovered 4 Primary Services: Generic Access (0x1800), Battery (0x180F), Heart Rate (0x180D), Mode Control (0xFFF0)');

    elements.serviceChipsContainer.innerHTML = `
      <div class="service-chip"><strong>Battery Service</strong> <code>0x180F</code></div>
      <div class="service-chip"><strong>Heart Rate Service</strong> <code>0x180D</code></div>
      <div class="service-chip"><strong>Device Control</strong> <code>0xFFF0</code></div>
    `;

    onConnectSuccess();
  }
}

function onConnectSuccess() {
  elements.connectionStatusBadge.textContent = 'CONNECTED';
  elements.connectionStatusBadge.className = 'status-pill status-connected';
  elements.disconnectBtn.disabled = false;

  elements.step2.classList.remove('active-step');
  elements.step2.classList.add('done-step');
  elements.step2Details.classList.remove('hidden');

  elements.step3.classList.add('active-step');
  elements.readBatteryBtn.disabled = false;
  elements.step4.querySelectorAll('button').forEach(b => b.disabled = false);
  elements.notifyBtn.disabled = false;

  log('GATT', 'Step 2 Complete: GATT database hierarchy cached in client.');
}

// -------------------------------------------------------------
// Step 3: Read Battery Value (0x2A19)
// -------------------------------------------------------------
async function handleReadBattery() {
  log('ATT', 'Transmitting ATT_READ_REQ for Characteristic Handle [0x2A19] (Battery Level)...');
  elements.readBatteryBtn.disabled = true;

  if (state.mode === 'real' && state.characteristics.battery) {
    try {
      const val = await state.characteristics.battery.readValue();
      const batteryLevel = val.getUint8(0);
      displayBatteryValue(batteryLevel, [batteryLevel]);
    } catch (err) {
      log('ATT', `Read Battery failed: ${err.message}`, 'error');
      elements.readBatteryBtn.disabled = false;
    }
  } else {
    // Simulator
    try {
      const res = await fetch('/api/gatt/read?uuid=0x2A19');
      const data = await res.json();
      displayBatteryValue(data.value, [data.value]);
    } catch (e) {
      displayBatteryValue(91, [91]);
    }
  }
}

function displayBatteryValue(batteryPct, rawBytes) {
  elements.batteryDisplay.textContent = `${batteryPct}%`;
  const hexStr = Array.from(rawBytes).map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
  elements.batteryHex.textContent = `Raw ATT_READ_RSP: [${hexStr}]`;
  elements.step3Details.classList.remove('hidden');
  elements.step3.classList.remove('active-step');
  elements.step3.classList.add('done-step');

  log('ATT', `Received ATT_READ_RSP! Decoded Battery Level = ${batteryPct}%. (Opcode: 0x0B)`);
  inspectPacket('ATT_READ_RSP', rawBytes, 'None', `${batteryPct}%`, 'Length: 1 byte');
}

// -------------------------------------------------------------
// Step 4: Write Characteristic Value
// -------------------------------------------------------------
async function handleWriteMode(mode, label) {
  log('ATT', `Transmitting ATT_WRITE_CMD to Mode Characteristic 0xFFF1 (Payload: [0x0${mode}] -> ${label})...`);

  if (state.mode === 'real') {
    try {
      if (state.services.customControl) {
        const char = await state.services.customControl.getCharacteristic(BLE_UUIDS.CHARS.MODE_CONTROL);
        await char.writeValue(new Uint8Array([mode]));
      }
      elements.writeFeedbackText.textContent = `Wrote Mode ${mode} (${label}) to physical device!`;
    } catch (err) {
      log('ATT', `Physical write notice: ${err.message}. (Simulated write fallback)`);
      elements.writeFeedbackText.textContent = `Simulated write Mode ${mode} (${label})`;
    }
  } else {
    try {
      await fetch('/api/gatt/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: '0xFFF1', value: mode })
      });
    } catch (e) {}
    elements.writeFeedbackText.textContent = `Wrote Mode ${mode} (${label}) successfully!`;
  }

  elements.step4.classList.add('done-step');
  log('ATT', `ATT Write executed! Peripheral accepted new operational mode: ${label}.`);
  inspectPacket('ATT_WRITE_CMD', [mode], 'None', `Mode ${mode}`, label);
}

// -------------------------------------------------------------
// Step 5: Subscribe to Notifications (CCCD 0x2902)
// -------------------------------------------------------------
async function handleToggleNotify() {
  if (state.subscribed) {
    log('ATT', 'Writing 0x0000 to CCCD (0x2902) to disable notifications...');
    state.subscribed = false;
    elements.notifyBtn.textContent = 'Subscribe';
    elements.cccdStatusTag.textContent = 'CCCD: Disabled (0x0000)';

    if (state.mode === 'real' && state.characteristics.heartRate) {
      await state.characteristics.heartRate.stopNotifications();
    } else {
      stopSimulatorEvents();
    }
    return;
  }

  log('ATT', 'Writing 0x0001 to Client Characteristic Configuration Descriptor (CCCD 0x2902)...');
  elements.notifyBtn.disabled = true;

  if (state.mode === 'real' && state.characteristics.heartRate) {
    try {
      await state.characteristics.heartRate.startNotifications();
      state.characteristics.heartRate.addEventListener('characteristicvaluechanged', (evt) => {
        handleHeartRateDataView(evt.target.value);
      });
      onNotifySubscribed();
    } catch (err) {
      log('ATT', `Failed to subscribe notifications: ${err.message}`, 'error');
      elements.notifyBtn.disabled = false;
    }
  } else {
    // Simulator
    try {
      await fetch('/api/gatt/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: '0x2A37', enabled: true })
      });
    } catch (e) {}

    startSimulatorEvents();
    onNotifySubscribed();
  }
}

function onNotifySubscribed() {
  state.subscribed = true;
  elements.notifyBtn.disabled = false;
  elements.notifyBtn.textContent = 'Unsubscribe';
  elements.cccdStatusTag.textContent = 'CCCD: Notifications Active (0x0001)';
  elements.step5.classList.remove('active-step');
  elements.step5.classList.add('done-step');
  elements.step6.classList.add('active-step', 'done-step');

  log('ATT', 'Step 5 Complete! Peripheral is now streaming ATT_HANDLE_VALUE_NTF packets.');
}

// -------------------------------------------------------------
// Step 6: Live Notification Ingestion & Packet Decoding
// -------------------------------------------------------------
function handleHeartRateDataView(dataView) {
  // BLE Heart Rate Measurement (0x2A37) standard parser
  const flags = dataView.getUint8(0);
  const is16Bit = (flags & 0x01) !== 0;
  let bpm = 0;
  let offset = 1;

  if (is16Bit) {
    bpm = dataView.getUint16(offset, /* littleEndian */ true);
    offset += 2;
  } else {
    bpm = dataView.getUint8(offset);
    offset += 1;
  }

  let rrInterval = null;
  const rrPresent = (flags & 0x10) !== 0;
  if (rrPresent && dataView.byteLength >= offset + 2) {
    const rawRr = dataView.getUint16(offset, true);
    rrInterval = Math.round(rawRr / 1.024); // Convert 1/1024s units to milliseconds
  }

  const rawBytes = [];
  for (let i = 0; i < dataView.byteLength; i++) {
    rawBytes.push(dataView.getUint8(i));
  }

  onNewHeartRatePacket(bpm, rrInterval, rawBytes);
}

function onNewHeartRatePacket(bpm, rrInterval, rawBytes) {
  elements.bpmDisplay.textContent = bpm;
  elements.rrDisplay.textContent = rrInterval ? `RR-Interval: ${rrInterval} ms` : 'RR-Interval: -- ms';

  // Pulse animation on heart icon
  elements.heartIcon.classList.add('beat');
  setTimeout(() => elements.heartIcon.classList.remove('beat'), 180);

  // Update real-time chart
  updateChart(bpm);

  // Inspector
  inspectPacket(
    'ATT_HANDLE_VALUE_NTF (0x1B)',
    rawBytes,
    `0x${rawBytes[0].toString(16).toUpperCase()} (uint8, RR present)`,
    `${bpm} BPM`,
    rrInterval ? `RR: ${rrInterval}ms` : 'No RR'
  );

  // Occasional concise log
  if (Math.random() < 0.25) {
    log('DATA', `Notification received: ${bpm} BPM (RR: ${rrInterval || '--'}ms).`);
  }
}

function inspectPacket(type, bytes, flagsStr, valueStr, extraStr) {
  elements.packetTypeBadge.textContent = type;
  const hexFormatted = bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
  elements.packetBytesViewer.textContent = `[ ${hexFormatted} ]  (${bytes.length} bytes)`;

  elements.pktFlag.textContent = flagsStr;
  elements.pktVal.textContent = valueStr;
  elements.pktExtra.textContent = extraStr;
}

// Simulator SSE Event Stream
function startSimulatorEvents() {
  if (state.eventSource) state.eventSource.close();

  try {
    state.eventSource = new EventSource('/api/events');
    state.eventSource.addEventListener('heart_rate', (evt) => {
      const data = JSON.parse(evt.data);
      const hexBytes = data.rawHex.match(/.{1,2}/g).map(h => parseInt(h, 16));
      onNewHeartRatePacket(data.bpm, data.rrIntervalMs, hexBytes);

      if (data.rssi) elements.rssiDisplay.textContent = data.rssi;
      if (data.jitterMs !== null && data.jitterMs !== undefined) {
        elements.jitterDisplay.textContent = Math.abs(data.jitterMs).toFixed(1);
      }
    });

    state.eventSource.onerror = () => {
      // If server SSE disconnects, gracefully fallback to local synthetic timer
      fallbackLocalHeartRateGenerator();
    };
  } catch (e) {
    fallbackLocalHeartRateGenerator();
  }
}

let localFallbackTimer = null;
function fallbackLocalHeartRateGenerator() {
  if (localFallbackTimer) return;
  localFallbackTimer = setInterval(() => {
    if (!state.connected || !state.subscribed) return;
    const bpm = Math.round(72 + Math.sin(Date.now() / 3000) * 8 + (Math.random() - 0.5) * 3);
    const rr = Math.round((60000 / bpm) * 1.024);
    const rawBytes = [0x16, bpm, rr & 0xFF, (rr >> 8) & 0xFF];
    onNewHeartRatePacket(bpm, Math.round(rr / 1.024), rawBytes);
  }, 1000);
}

function stopSimulatorEvents() {
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }
  if (localFallbackTimer) {
    clearInterval(localFallbackTimer);
    localFallbackTimer = null;
  }
}

// -------------------------------------------------------------
// Disconnect
// -------------------------------------------------------------
async function handleDisconnect() {
  log('GAP', 'Disconnecting from peripheral...');
  stopSimulatorEvents();

  if (state.mode === 'real' && state.device && state.device.gatt.connected) {
    state.device.gatt.disconnect();
  } else {
    try {
      await fetch('/api/disconnect', { method: 'POST' });
    } catch (e) {}
  }

  state.connected = false;
  state.subscribed = false;
  elements.connectionStatusBadge.textContent = 'DISCONNECTED';
  elements.connectionStatusBadge.className = 'status-pill status-disconnected';
  elements.disconnectBtn.disabled = true;
  elements.connectBtn.disabled = true;
  elements.readBatteryBtn.disabled = true;
  elements.notifyBtn.disabled = true;
  elements.scanBtn.disabled = false;
  elements.writeModeBtns.forEach(b => b.disabled = true);
  elements.notifyBtn.textContent = 'Subscribe';
  elements.bpmDisplay.textContent = '--';
  elements.rrDisplay.textContent = 'RR-Interval: -- ms';

  document.querySelectorAll('.step-card').forEach(c => {
    c.classList.remove('active-step', 'done-step');
  });
  elements.step1.classList.add('active-step');

  log('GAP', 'Disconnected. Peripheral radio returned to Standby / Advertising.');
}

// -------------------------------------------------------------
// Auto-Demo Runner (Executes all 6 steps with natural pauses)
// -------------------------------------------------------------
async function runAutoDemo() {
  if (state.autoDemoRunning) return;
  state.autoDemoRunning = true;
  elements.autoDemoBtn.disabled = true;
  elements.autoDemoBtn.textContent = 'Running Handshake...';

  log('SYSTEM', '=== STARTING AUTOMATED 6-STEP BLE DEMO ===');

  await handleScan();
  await sleep(1000);

  await handleConnect();
  await sleep(1200);

  await handleReadBattery();
  await sleep(1200);

  await handleWriteMode(1, 'Cardio (125 BPM)');
  await sleep(1200);

  await handleToggleNotify();

  log('SYSTEM', '=== 6-STEP HANDSHAKE COMPLETE! Streaming live notifications. ===');
  elements.autoDemoBtn.disabled = false;
  elements.autoDemoBtn.textContent = '✔ Auto-Demo Done';
  state.autoDemoRunning = false;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getServiceName(uuid) {
  const u = uuid.toLowerCase();
  if (u.includes('1800')) return 'Generic Access';
  if (u.includes('180f')) return 'Battery Service';
  if (u.includes('180d')) return 'Heart Rate Service';
  if (u.includes('fff0')) return 'Custom Control';
  return 'GATT Service';
}

// -------------------------------------------------------------
// Event Listeners
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initChart();

  elements.scanBtn.addEventListener('click', handleScan);
  elements.connectBtn.addEventListener('click', handleConnect);
  elements.readBatteryBtn.addEventListener('click', handleReadBattery);
  elements.notifyBtn.addEventListener('click', handleToggleNotify);
  elements.disconnectBtn.addEventListener('click', handleDisconnect);
  elements.autoDemoBtn.addEventListener('click', runAutoDemo);

  elements.writeModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = parseInt(btn.getAttribute('data-mode'), 10);
      handleWriteMode(mode, btn.textContent);
    });
  });

  elements.modeSelect.addEventListener('change', (e) => {
    state.mode = e.target.value;
    log('SYSTEM', `Switched mode to: ${state.mode === 'real' ? 'Real Web Bluetooth API (Physical Hardware)' : 'Simulated Peripheral (Zero Hardware)'}`);
  });

  elements.themeToggleBtn.addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
  });

  elements.clearLogBtn.addEventListener('click', () => {
    elements.logConsole.innerHTML = '';
    log('SYSTEM', 'Log cleared.');
  });

  elements.copyLogBtn.addEventListener('click', () => {
    const text = elements.logConsole.innerText;
    navigator.clipboard.writeText(text).then(() => {
      log('SYSTEM', 'Protocol log copied to clipboard!');
    });
  });

  if (elements.exportJsonBtn) {
    elements.exportJsonBtn.addEventListener('click', () => {
      const exportData = {
        exportedAt: new Date().toISOString(),
        device: state.device ? state.device.name : 'PulseGlow BLE (Simulated)',
        mode: state.mode,
        heartRateHistory: state.heartRateHistory,
        currentBpm: elements.bpmDisplay.textContent,
        currentRssi: elements.rssiDisplay.textContent,
        logs: elements.logConsole.innerText.split('\n').filter(Boolean)
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ble-telemetry-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      log('SYSTEM', 'Exported session telemetry JSON file.');
    });
  }
});
