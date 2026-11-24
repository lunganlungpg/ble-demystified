/**
 * simulator.test.js - Unit tests for BLE GATT Simulator & Telemetry Engine
 *
 * Uses Node.js native test runner: node --test tests/*.test.js
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { SimulatedGattServer } = require('../simulator/server');
const { TelemetryEngine } = require('../simulator/telemetry');

describe('BLE GATT Peripheral Simulator', () => {
  let sim;

  before(() => {
    sim = new SimulatedGattServer({ port: 3456 });
  });

  after(() => {
    sim.disconnect();
  });

  test('GATT Database initializes with standard services and UUIDs', () => {
    const services = sim.gattDb.services;
    assert.equal(services.length, 4, 'Expected 4 primary services');

    const shortUuids = services.map(s => s.shortUuid);
    assert.ok(shortUuids.includes('0x1800'), 'Includes Generic Access (0x1800)');
    assert.ok(shortUuids.includes('0x180F'), 'Includes Battery Service (0x180F)');
    assert.ok(shortUuids.includes('0x180D'), 'Includes Heart Rate Service (0x180D)');
    assert.ok(shortUuids.includes('0xFFF0'), 'Includes Custom Simulator Control (0xFFF0)');
  });

  test('GAP state transitions from ADVERTISING to CONNECTED and back', () => {
    assert.equal(sim.state, 'ADVERTISING');
    assert.equal(sim.connected, false);

    sim.connect();
    assert.equal(sim.state, 'CONNECTED');
    assert.equal(sim.connected, true);

    sim.disconnect();
    assert.equal(sim.state, 'ADVERTISING');
    assert.equal(sim.connected, false);
  });

  test('Reading Battery Level (0x2A19) returns valid percentage buffer', () => {
    const batteryService = sim.gattDb.services.find(s => s.shortUuid === '0x180F');
    const batteryChar = batteryService.characteristics.find(c => c.shortUuid === '0x2A19');

    assert.ok(batteryChar, 'Battery characteristic found');
    const buf = batteryChar.getValue();
    assert.ok(Buffer.isBuffer(buf), 'Returned value is a Buffer');
    assert.equal(buf.length, 1, 'Battery value is 1 byte');

    const val = buf.readUInt8(0);
    assert.ok(val >= 0 && val <= 100, `Battery level ${val}% is within 0-100%`);
  });

  test('Writing Mode Control (0xFFF1) modifies simulation workout intensity', () => {
    const customService = sim.gattDb.services.find(s => s.shortUuid === '0xFFF0');
    const modeChar = customService.characteristics.find(c => c.shortUuid === '0xFFF1');

    assert.ok(modeChar.properties.includes('WRITE'), 'Characteristic has WRITE property');

    // Write Cardio Mode (1)
    modeChar.onWrite(Buffer.from([1]));
    assert.equal(sim.workoutMode, 1);
    assert.equal(sim.targetBpm, 125, 'Cardio mode targets 125 BPM');

    // Write Sprint Mode (2)
    modeChar.onWrite(Buffer.from([2]));
    assert.equal(sim.workoutMode, 2);
    assert.equal(sim.targetBpm, 168, 'Sprint mode targets 168 BPM');

    // Write Resting Mode (0)
    modeChar.onWrite(Buffer.from([0]));
    assert.equal(sim.workoutMode, 0);
    assert.equal(sim.targetBpm, 72, 'Resting mode targets 72 BPM');
  });

  test('CCCD subscription toggles Heart Rate notifications', () => {
    assert.equal(sim.subscriptions.heartRate, false);

    const okEnable = sim.setSubscription('0x2A37', true);
    assert.equal(okEnable, true);
    assert.equal(sim.subscriptions.heartRate, true);
    assert.ok(sim.heartRateTimer !== null, 'Timer started');

    const okDisable = sim.setSubscription('0x2A37', false);
    assert.equal(okDisable, true);
    assert.equal(sim.subscriptions.heartRate, false);
    assert.equal(sim.heartRateTimer, null, 'Timer cleared');
  });
});

describe('Telemetry Engine & Data Generator', () => {
  test('TelemetryEngine logs events and computes packet jitter', async () => {
    const engine = new TelemetryEngine({ maxEvents: 10 });

    const event1 = engine.logEvent('NOTIFICATION', { bpm: 72 });
    assert.ok(event1.id === 1);
    assert.ok(event1.rssi <= -50 && event1.rssi >= -85);

    // Sleep briefly to simulate connection interval
    await new Promise(r => setTimeout(r, 25));

    const event2 = engine.logEvent('NOTIFICATION', { bpm: 74 });
    assert.ok(event2.interArrivalMs !== null);
    assert.ok(event2.interArrivalMs >= 20, `Inter-arrival was ${event2.interArrivalMs}ms`);
    assert.ok(typeof event2.jitterMs === 'number');
  });

  test('generateSampleDataset produces compliant time-series and throughput benchmark', () => {
    const dataset = TelemetryEngine.generateSampleDataset(null);

    assert.ok(dataset.metadata, 'Dataset contains metadata');
    assert.equal(dataset.timeSeries.length, 200, 'Emits 200 time-series points');
    assert.equal(dataset.throughputBenchmark.length, 5, 'Contains 5 MTU benchmark points');

    const firstPt = dataset.timeSeries[0];
    assert.ok(firstPt.bpm >= 60 && firstPt.bpm <= 100);
    assert.ok(firstPt.rawPayloadHex.startsWith('10-'));
    assert.ok(firstPt.interArrivalMs > 0);
  });
});
