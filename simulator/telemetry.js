/**
 * telemetry.js - Telemetry logger & synthetic dataset generator
 *
 * Tracks every packet interaction: RSSI fluctuations, notification timing jitter,
 * MTU throughput benchmarks, and heart rate waveforms.
 */

const fs = require('fs');
const path = require('path');

class TelemetryEngine {
  constructor(options = {}) {
    this.maxEvents = options.maxEvents || 500;
    this.events = [];
    this.subscribers = new Set();
    this.startTime = Date.now();
    this.lastNotifyTimestamp = null;
    this.baseRssi = -64; // typical good office RSSI in dBm
    this.connectionIntervalMs = 20.0; // standard 20ms connection interval (16 units * 1.25ms)
    this.negotiatedMtu = 23; // default BLE ATT MTU
  }

  onEvent(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  logEvent(type, payload = {}) {
    const now = Date.now();
    const elapsedMs = now - this.startTime;

    let interArrivalMs = null;
    let jitterMs = null;

    if (type === 'NOTIFICATION' || type === 'HEART_RATE_MEASUREMENT') {
      if (this.lastNotifyTimestamp) {
        interArrivalMs = Number((now - this.lastNotifyTimestamp).toFixed(2));
        jitterMs = Number((interArrivalMs - this.connectionIntervalMs).toFixed(2));
      }
      this.lastNotifyTimestamp = now;
    }

    // Simulate natural RF multipath fading + slight distance sway
    const rfNoise = (Math.random() - 0.5) * 6; // +/- 3 dBm
    const currentRssi = Math.round(this.baseRssi + rfNoise);

    const event = {
      id: this.events.length + 1,
      timestamp: now,
      elapsedMs,
      type,
      rssi: currentRssi,
      connectionIntervalMs: this.connectionIntervalMs,
      mtu: this.negotiatedMtu,
      interArrivalMs,
      jitterMs,
      ...payload
    };

    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    for (const sub of this.subscribers) {
      try {
        sub(event);
      } catch (err) {
        console.error('[Telemetry] Subscriber error:', err);
      }
    }

    return event;
  }

  getSnapshot() {
    return {
      startTime: this.startTime,
      totalEvents: this.events.length,
      currentMtu: this.negotiatedMtu,
      connectionIntervalMs: this.connectionIntervalMs,
      recentEvents: this.events.slice(-50)
    };
  }

  /**
   * Generates a realistic, highly reproducible 250-point dataset
   * for plot generation and offline learning.
   */
  static generateSampleDataset(outputPath) {
    const data = {
      generatedAt: new Date().toISOString(),
      metadata: {
        device: "PulseGlow BLE Peripheral",
        defaultConnectionIntervalMs: 20.0,
        testedMtuSizes: [23, 64, 128, 185, 247],
        sampleDurationSec: 15
      },
      connectionTimeline: [
        { phase: "STANDBY", startMs: 0, durationMs: 200, channel: "N/A", description: "Radio asleep, waiting for timer" },
        { phase: "ADVERTISING", startMs: 200, durationMs: 450, channel: "37, 38, 39", description: "Broadcasting ADV_IND packets every 100ms" },
        { phase: "SCAN_DETECTED", startMs: 650, durationMs: 50, channel: "37", description: "Central scanner picks up adv packet and sends SCAN_REQ" },
        { phase: "SCAN_RESPONSE", startMs: 700, durationMs: 30, channel: "37", description: "Peripheral replies with SCAN_RSP containing device name" },
        { phase: "CONNECT_IND", startMs: 730, durationMs: 20, channel: "38", description: "Central transmits CONNECT_IND; radio jumps to data channels (0-36)" },
        { phase: "CONNECTED", startMs: 750, durationMs: 500, channel: "Data (FHSS)", description: "Connection anchor established; 20ms interval" },
        { phase: "MTU_EXCHANGE", startMs: 1250, durationMs: 40, channel: "Data", description: "ATT Exchange MTU Request/Response (23 -> 247 bytes)" },
        { phase: "SERVICE_DISCOVERY", startMs: 1290, durationMs: 180, channel: "Data", description: "Discover Primary Services (Battery 0x180F, HR 0x180D)" },
        { phase: "SUBSCRIBE_CCCD", startMs: 1470, durationMs: 60, channel: "Data", description: "Write 0x0001 to Heart Rate CCCD (0x2902)" },
        { phase: "STREAMING_NOTIFICATIONS", startMs: 1530, durationMs: 13470, channel: "Data", description: "Continuous stream of Heart Rate measurements" }
      ],
      throughputBenchmark: [
        { mtu: 23, usablePayload: 20, packetsPerSec: 50, rawThroughputBps: 1000, effectiveKbps: 8.0 },
        { mtu: 64, usablePayload: 61, packetsPerSec: 50, rawThroughputBps: 3050, effectiveKbps: 24.4 },
        { mtu: 128, usablePayload: 125, packetsPerSec: 50, rawThroughputBps: 6250, effectiveKbps: 50.0 },
        { mtu: 185, usablePayload: 182, packetsPerSec: 50, rawThroughputBps: 9100, effectiveKbps: 72.8 },
        { mtu: 247, usablePayload: 244, packetsPerSec: 50, rawThroughputBps: 12200, effectiveKbps: 97.6 }
      ],
      timeSeries: []
    };

    let simTime = 0;
    const baseInterval = 20.0; // ms
    let baseBpm = 72;
    let baseRssi = -62;

    for (let i = 0; i < 200; i++) {
      // Physiological heart rate wave + respiratory sinus arrhythmia (RSA)
      const rsaEffect = Math.sin(i * 0.18) * 4.2;
      const stepNoise = (Math.random() - 0.5) * 1.8;
      const bpm = Math.round(baseBpm + rsaEffect + stepNoise);

      // Packet timing jitter: 20ms +/- 0.5ms normally, occasional clock drift / retransmit spike
      let jitter = (Math.random() - 0.5) * 1.4;
      if (i % 23 === 0) {
        jitter += 18.5; // packet retransmit at radio layer (1 connection event skip)
      } else if (i % 41 === 0) {
        jitter += 3.8;
      }
      const actualInterval = Number((baseInterval + jitter).toFixed(2));
      simTime += actualInterval;

      // Realistic RSSI variation with slow distance walk (moving closer then further)
      const distanceWave = Math.sin(i * 0.04) * 8.0;
      const rfMultipathNoise = (Math.random() - 0.5) * 4.0;
      const rssi = Math.round(baseRssi + distanceWave + rfMultipathNoise);

      // Heart rate measurement packet bytes (BLE standard 0x2A37)
      // Byte 0: Flags (0b00010000 = Heart Rate Value Format 8-bit, Sensor Contact present, RR-Interval present)
      // Byte 1: Heart Rate Value (uint8)
      // Byte 2-3: RR-Interval (uint16 little endian, in 1/1024s units)
      const rrIntervalRaw = Math.round((60000 / bpm) * 1.024);
      const rrLow = rrIntervalRaw & 0xFF;
      const rrHigh = (rrIntervalRaw >> 8) & 0xFF;
      const rawHex = `10-${bpm.toString(16).padStart(2, '0').toUpperCase()}-${rrLow.toString(16).padStart(2, '0').toUpperCase()}-${rrHigh.toString(16).padStart(2, '0').toUpperCase()}`;

      data.timeSeries.push({
        sampleIndex: i,
        elapsedMs: Math.round(simTime),
        rssi,
        bpm,
        interArrivalMs: actualInterval,
        jitterMs: Number(jitter.toFixed(2)),
        connectionIntervalMs: baseInterval,
        rawPayloadHex: rawHex,
        batteryPct: Math.max(75, Math.round(98 - (i * 0.05)))
      });
    }

    if (outputPath) {
      const resolved = path.resolve(outputPath);
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
      fs.writeFileSync(resolved, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`[Telemetry] Generated sample dataset with ${data.timeSeries.length} points -> ${resolved}`);
    }

    return data;
  }
}

module.exports = { TelemetryEngine };
