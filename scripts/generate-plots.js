/**
 * generate-plots.js - Pure Node.js SVG Plot & Diagram Generator
 *
 * Reads telemetry data from data/telemetry.sample.json and generates
 * 5 crisp, publication-quality telemetry plots into docs/img/*.svg,
 * exports 6 Mermaid source files into docs/diagrams/*.mmd,
 * and renders their standalone SVG counterparts into docs/img/*.svg.
 *
 * Zero external npm dependencies required!
 */

const fs = require('fs');
const path = require('path');
const { TelemetryEngine } = require('../simulator/telemetry');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT_DIR, 'data', 'telemetry.sample.json');
const IMG_DIR = path.join(ROOT_DIR, 'docs', 'img');
const DIAGRAMS_DIR = path.join(ROOT_DIR, 'docs', 'diagrams');

fs.mkdirSync(IMG_DIR, { recursive: true });
fs.mkdirSync(DIAGRAMS_DIR, { recursive: true });

// Ensure telemetry sample exists
if (!fs.existsSync(DATA_PATH)) {
  console.log('[Generator] Telemetry dataset missing; generating fresh sample...');
  TelemetryEngine.generateSampleDataset(DATA_PATH);
}

const rawData = fs.readFileSync(DATA_PATH, 'utf-8');
const telemetry = JSON.parse(rawData);
const timeSeries = telemetry.timeSeries;

console.log(`[Generator] Loaded ${timeSeries.length} points from ${DATA_PATH}`);

// =========================================================================
// SVG HELPER PRIMITIVES
// =========================================================================
function createSvgWrapper(width, height, title, content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>
    .bg { fill: #0f172a; }
    .grid { stroke: #1e293b; stroke-width: 1; }
    .axis { stroke: #334155; stroke-width: 1.5; }
    .text-title { font-family: system-ui, -apple-system, sans-serif; font-size: 16px; font-weight: 700; fill: #f8fafc; }
    .text-subtitle { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; fill: #94a3b8; }
    .text-label { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; fill: #94a3b8; }
    .text-axis { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 600; fill: #cbd5e1; }
    .line-primary { fill: none; stroke: #38bdf8; stroke-width: 2.2; stroke-linejoin: round; stroke-linecap: round; }
    .line-accent { fill: none; stroke: #f43f5e; stroke-width: 2.0; stroke-linejoin: round; stroke-linecap: round; }
    .area-primary { fill: rgba(56, 189, 248, 0.12); }
    .legend-box { fill: #1e293b; stroke: #334155; rx: 6; }
  </style>
  <rect width="${width}" height="${height}" rx="10" class="bg" />
  <!-- Header -->
  <text x="40" y="34" class="text-title">${title}</text>
  <text x="40" y="50" class="text-subtitle">BLE Demystified Telemetry Engine &bull; Link Layer Capture</text>
  ${content}
</svg>`;
}

// =========================================================================
// 1. PLOT: RSSI VS TIME (plot-rssi-time.svg)
// =========================================================================
function generatePlotRssiTime() {
  const w = 780;
  const h = 380;
  const padLeft = 65;
  const padRight = 40;
  const padTop = 75;
  const padBottom = 55;

  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  const minRssi = -85;
  const maxRssi = -50;

  // Grid & Y-ticks
  let gridSvg = '';
  for (let r = minRssi; r <= maxRssi; r += 5) {
    const y = padTop + chartH - ((r - minRssi) / (maxRssi - minRssi)) * chartH;
    gridSvg += `<line x1="${padLeft}" y1="${y}" x2="${w - padRight}" y2="${y}" class="grid" />`;
    gridSvg += `<text x="${padLeft - 10}" y="${y + 4}" text-anchor="end" class="text-label">${r} dBm</text>`;
  }

  // Points & Area
  const points = timeSeries.map((d, i) => {
    const x = padLeft + (i / (timeSeries.length - 1)) * chartW;
    const y = padTop + chartH - ((d.rssi - minRssi) / (maxRssi - minRssi)) * chartH;
    return { x, y, rssi: d.rssi, ms: d.elapsedMs };
  });

  const polylineStr = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaStr = `${points[0].x},${padTop + chartH} ` + polylineStr + ` ${points[points.length - 1].x},${padTop + chartH}`;

  // Time X-ticks
  let xTicksSvg = '';
  for (let i = 0; i <= 4; i++) {
    const x = padLeft + (i / 4) * chartW;
    const sec = ((i / 4) * (timeSeries[timeSeries.length - 1].elapsedMs / 1000)).toFixed(1);
    xTicksSvg += `<line x1="${x}" y1="${padTop + chartH}" x2="${x}" y2="${padTop + chartH + 5}" class="axis" />`;
    xTicksSvg += `<text x="${x}" y="${padTop + chartH + 20}" text-anchor="middle" class="text-label">${sec} s</text>`;
  }

  // Legend
  const legend = `
    <g transform="translate(${w - 240}, 20)">
      <rect width="200" height="32" class="legend-box" />
      <line x1="15" y1="16" x2="45" y2="16" class="line-primary" />
      <circle cx="30" cy="16" r="3" fill="#38bdf8" />
      <text x="55" y="20" class="text-label">Received RSSI (dBm)</text>
    </g>
  `;

  const content = `
    ${gridSvg}
    ${xTicksSvg}
    <polygon points="${areaStr}" class="area-primary" />
    <polyline points="${polylineStr}" class="line-primary" />
    <!-- Axes Labels -->
    <text x="${w / 2}" y="${h - 15}" text-anchor="middle" class="text-axis">Elapsed Time (seconds)</text>
    <text x="18" y="${padTop + chartH / 2}" transform="rotate(-90 18 ${padTop + chartH / 2})" text-anchor="middle" class="text-axis">Signal Strength RSSI (dBm)</text>
    ${legend}
  `;

  fs.writeFileSync(path.join(IMG_DIR, 'plot-rssi-time.svg'), createSvgWrapper(w, h, 'RF Signal Strength vs. Time (Multipath Fading)', content));
}

// =========================================================================
// 2. PLOT: JITTER HISTOGRAM (plot-jitter-histogram.svg)
// =========================================================================
function generatePlotJitterHistogram() {
  const w = 780;
  const h = 380;
  const padLeft = 65;
  const padRight = 40;
  const padTop = 75;
  const padBottom = 55;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  // Buckets: 18ms to 42ms in 2ms increments
  const buckets = [
    { label: '18-20ms', min: 18, max: 20, count: 0 },
    { label: '20-22ms', min: 20, max: 22, count: 0 }, // Target bin!
    { label: '22-24ms', min: 22, max: 24, count: 0 },
    { label: '24-28ms', min: 24, max: 28, count: 0 },
    { label: '28-36ms', min: 28, max: 36, count: 0 },
    { label: '38-42ms', min: 38, max: 42, count: 0 }  // Retransmission spike
  ];

  timeSeries.forEach(d => {
    const v = d.interArrivalMs;
    if (v >= 18 && v < 20) buckets[0].count++;
    else if (v >= 20 && v <= 22) buckets[1].count++;
    else if (v > 22 && v <= 24) buckets[2].count++;
    else if (v > 24 && v <= 28) buckets[3].count++;
    else if (v > 28 && v <= 36) buckets[4].count++;
    else if (v > 36) buckets[5].count++;
  });

  const maxCount = Math.max(...buckets.map(b => b.count), 150);

  let barsSvg = '';
  const barW = (chartW / buckets.length) * 0.7;
  const step = chartW / buckets.length;

  buckets.forEach((b, i) => {
    const x = padLeft + i * step + (step - barW) / 2;
    const barH = (b.count / maxCount) * chartH;
    const y = padTop + chartH - barH;
    const isTarget = i === 1;
    const fill = isTarget ? '#38bdf8' : (i === 5 ? '#f43f5e' : '#64748b');

    barsSvg += `
      <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="${fill}" />
      <text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" class="text-label">${b.count}</text>
      <text x="${x + barW / 2}" y="${padTop + chartH + 20}" text-anchor="middle" class="text-label">${b.label}</text>
    `;
  });

  // Callout on target bin
  const callout = `
    <g transform="translate(${padLeft + step * 1.5}, ${padTop + 30})">
      <rect width="210" height="48" rx="6" fill="#1e293b" stroke="#38bdf8" />
      <text x="12" y="20" class="text-label" fill="#38bdf8" font-weight="bold">Connection Interval Peak (20ms)</text>
      <text x="12" y="36" class="text-subtitle">Clock drift jitter: &plusmn;0.8 ms</text>
    </g>
  `;

  const content = `
    <!-- Axis lines -->
    <line x1="${padLeft}" y1="${padTop + chartH}" x2="${w - padRight}" y2="${padTop + chartH}" class="axis" />
    ${barsSvg}
    ${callout}
    <text x="${w / 2}" y="${h - 15}" text-anchor="middle" class="text-axis">Packet Inter-Arrival Time Window (ms)</text>
    <text x="18" y="${padTop + chartH / 2}" transform="rotate(-90 18 ${padTop + chartH / 2})" text-anchor="middle" class="text-axis">Frequency (Packet Count)</text>
  `;

  fs.writeFileSync(path.join(IMG_DIR, 'plot-jitter-histogram.svg'), createSvgWrapper(w, h, 'Notification Inter-Arrival Timing & Jitter Histogram', content));
}

// =========================================================================
// 3. PLOT: HEART RATE WAVE (plot-heart-rate-wave.svg)
// =========================================================================
function generatePlotHeartRateWave() {
  const w = 780;
  const h = 380;
  const padLeft = 65;
  const padRight = 40;
  const padTop = 75;
  const padBottom = 55;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  const minBpm = 60;
  const maxBpm = 88;

  // Grid
  let gridSvg = '';
  for (let b = minBpm; b <= maxBpm; b += 5) {
    const y = padTop + chartH - ((b - minBpm) / (maxBpm - minBpm)) * chartH;
    gridSvg += `<line x1="${padLeft}" y1="${y}" x2="${w - padRight}" y2="${y}" class="grid" />`;
    gridSvg += `<text x="${padLeft - 10}" y="${y + 4}" text-anchor="end" class="text-label">${b} BPM</text>`;
  }

  const points = timeSeries.map((d, i) => {
    const x = padLeft + (i / (timeSeries.length - 1)) * chartW;
    const y = padTop + chartH - ((d.bpm - minBpm) / (maxBpm - minBpm)) * chartH;
    return { x, y };
  });

  const polylineStr = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  let xTicksSvg = '';
  for (let i = 0; i <= 4; i++) {
    const x = padLeft + (i / 4) * chartW;
    const sec = ((i / 4) * (timeSeries[timeSeries.length - 1].elapsedMs / 1000)).toFixed(1);
    xTicksSvg += `<line x1="${x}" y1="${padTop + chartH}" x2="${x}" y2="${padTop + chartH + 5}" class="axis" />`;
    xTicksSvg += `<text x="${x}" y="${padTop + chartH + 20}" text-anchor="middle" class="text-label">${sec} s</text>`;
  }

  const legend = `
    <g transform="translate(${w - 230}, 20)">
      <rect width="190" height="32" class="legend-box" />
      <line x1="15" y1="16" x2="45" y2="16" class="line-accent" />
      <circle cx="30" cy="16" r="3" fill="#f43f5e" />
      <text x="55" y="20" class="text-label">Live Heart Rate (BPM)</text>
    </g>
  `;

  const content = `
    ${gridSvg}
    ${xTicksSvg}
    <polyline points="${polylineStr}" class="line-accent" />
    <text x="${w / 2}" y="${h - 15}" text-anchor="middle" class="text-axis">Session Duration (seconds)</text>
    <text x="18" y="${padTop + chartH / 2}" transform="rotate(-90 18 ${padTop + chartH / 2})" text-anchor="middle" class="text-axis">Heart Rate (Beats Per Minute)</text>
    ${legend}
  `;

  fs.writeFileSync(path.join(IMG_DIR, 'plot-heart-rate-wave.svg'), createSvgWrapper(w, h, 'Physiological Waveform: Heart Rate Stream (0x2A37)', content));
}

// =========================================================================
// 4. PLOT: THROUGHPUT VS MTU (plot-throughput-mtu.svg)
// =========================================================================
function generatePlotThroughputMtu() {
  const w = 780;
  const h = 380;
  const padLeft = 70;
  const padRight = 40;
  const padTop = 75;
  const padBottom = 55;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  const data = telemetry.throughputBenchmark;
  const maxKbps = 110;

  let barsSvg = '';
  const barW = (chartW / data.length) * 0.6;
  const step = chartW / data.length;

  data.forEach((d, i) => {
    const x = padLeft + i * step + (step - barW) / 2;
    const barH = (d.effectiveKbps / maxKbps) * chartH;
    const y = padTop + chartH - barH;

    barsSvg += `
      <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="5" fill="#38bdf8" />
      <text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" class="text-label" font-weight="bold">${d.effectiveKbps.toFixed(1)} kbps</text>
      <text x="${x + barW / 2}" y="${padTop + chartH + 20}" text-anchor="middle" class="text-label">MTU ${d.mtu}</text>
      <text x="${x + barW / 2}" y="${padTop + chartH + 34}" text-anchor="middle" class="text-subtitle">(${d.usablePayload}B payload)</text>
    `;
  });

  let gridSvg = '';
  for (let k = 0; k <= maxKbps; k += 25) {
    const y = padTop + chartH - (k / maxKbps) * chartH;
    gridSvg += `<line x1="${padLeft}" y1="${y}" x2="${w - padRight}" y2="${y}" class="grid" />`;
    gridSvg += `<text x="${padLeft - 10}" y="${y + 4}" text-anchor="end" class="text-label">${k} kbps</text>`;
  }

  const content = `
    ${gridSvg}
    <line x1="${padLeft}" y1="${padTop + chartH}" x2="${w - padRight}" y2="${padTop + chartH}" class="axis" />
    ${barsSvg}
    <text x="${w / 2}" y="${h - 6}" text-anchor="middle" class="text-axis">Negotiated ATT MTU Size (Bytes)</text>
    <text x="20" y="${padTop + chartH / 2}" transform="rotate(-90 20 ${padTop + chartH / 2})" text-anchor="middle" class="text-axis">Effective Throughput (kbps)</text>
  `;

  fs.writeFileSync(path.join(IMG_DIR, 'plot-throughput-mtu.svg'), createSvgWrapper(w, h, 'Effective Data Throughput vs. ATT MTU Size', content));
}

// =========================================================================
// 5. PLOT: PACKET TIMELINE GANTT (plot-packet-timeline.svg)
// =========================================================================
function generatePlotPacketTimeline() {
  const w = 840;
  const h = 420;
  const padLeft = 180;
  const padRight = 40;
  const padTop = 75;
  const padBottom = 55;
  const chartW = w - padLeft - padRight;

  const phases = telemetry.connectionTimeline.slice(0, 9); // first 9 phases
  const totalMs = 1600; // total timeline window to display

  let rowsSvg = '';
  const rowH = 26;
  const gap = 8;

  phases.forEach((p, i) => {
    const y = padTop + i * (rowH + gap);
    const startX = padLeft + (p.startMs / totalMs) * chartW;
    const durW = Math.max(8, (p.durationMs / totalMs) * chartW);

    const colors = ['#64748b', '#38bdf8', '#f59e0b', '#10b981', '#a855f7', '#0284c7', '#38bdf8', '#10b981', '#f43f5e'];
    const barColor = colors[i % colors.length];

    rowsSvg += `
      <text x="${padLeft - 12}" y="${y + 17}" text-anchor="end" class="text-label" font-weight="600">${p.phase}</text>
      <rect x="${startX}" y="${y}" width="${durW}" height="${rowH}" rx="4" fill="${barColor}" opacity="0.9" />
      <text x="${startX + durW + 8}" y="${y + 17}" class="text-subtitle">${p.durationMs}ms &bull; ${p.channel}</text>
    `;
  });

  // Time ticks
  let ticksSvg = '';
  for (let t = 0; t <= totalMs; t += 400) {
    const x = padLeft + (t / totalMs) * chartW;
    ticksSvg += `<line x1="${x}" y1="${padTop - 10}" x2="${x}" y2="${padTop + phases.length * (rowH + gap)}" class="grid" />`;
    ticksSvg += `<text x="${x}" y="${padTop + phases.length * (rowH + gap) + 20}" text-anchor="middle" class="text-label">${t} ms</text>`;
  }

  const content = `
    ${ticksSvg}
    ${rowsSvg}
    <text x="${padLeft + chartW / 2}" y="${h - 12}" text-anchor="middle" class="text-axis">Handshake Elapsed Time (milliseconds)</text>
  `;

  fs.writeFileSync(path.join(IMG_DIR, 'plot-packet-timeline.svg'), createSvgWrapper(w, h, 'Protocol Gantt Timeline: Advertising to Data Stream', content));
}

// =========================================================================
// MERMAID DIAGRAM SOURCES & SVG EXPORTS
// =========================================================================
const MERMAID_DIAGRAMS = {
  'gap-state-machine': {
    title: 'GAP State Machine',
    mmd: `stateDiagram-v2
    [*] --> STANDBY
    STANDBY --> ADVERTISING : Enable Advertising (Peripheral)
    STANDBY --> SCANNING : Start Scanning (Central)
    ADVERTISING --> STANDBY : Stop Advertising / Timeout
    SCANNING --> STANDBY : Stop Scanning
    SCANNING --> INITIATING : Target ADV_IND Packet Detected
    INITIATING --> CONNECTED : Transmit CONNECT_IND / Synchronize
    ADVERTISING --> CONNECTED : Receive CONNECT_IND
    CONNECTED --> STANDBY : Link Disconnect / Supervision Timeout
`
  },
  'ble-stack-layers': {
    title: 'BLE Protocol Stack Architecture',
    mmd: `flowchart TD
    subgraph APPLICATION_LAYER["Application Layer"]
        APP["Application (Fitness App, HealthKit, Web Bluetooth)"]
        PROFILE["Profiles (Heart Rate Profile HRP, Battery Profile)"]
    end

    subgraph HOST["Host (Operating System / Software Stack)"]
        GAP["GAP (Generic Access Profile: Roles, Adv, Scanning, Conn)"]
        GATT["GATT (Generic Attribute Profile: Services & Characteristics)"]
        ATT["ATT (Attribute Protocol: Client/Server, Opcodes, Handles)"]
        SMP["SMP (Security Manager: Pairing, AES-128 Encryption, Bonding)"]
        L2CAP["L2CAP (Logical Link Control: Multiplexing, Segmentation)"]
    end

    subgraph CONTROLLER["Controller (Hardware / Radio Silicon)"]
        HCI["HCI (Host Controller Interface: UART/USB transport)"]
        LL["Link Layer (State Machine, Timing, 40 Channels, FHSS)"]
        PHY["Physical Layer PHY (2.4 GHz GFSK, 1 Mbps / 2 Mbps / Coded)"]
    end

    APP --> PROFILE
    PROFILE --> GATT
    GATT --> ATT
    GAP --> LL
    ATT --> L2CAP
    SMP --> L2CAP
    L2CAP --> HCI
    HCI --> LL
    LL --> PHY
`
  },
  'gatt-hierarchy': {
    title: 'GATT Database Hierarchy',
    mmd: `flowchart TD
    PROFILE["Heart Rate Sensor Profile (HRP)"]

    subgraph SERVICES["Primary GATT Services"]
        S1["Generic Access Service (0x1800)"]
        S2["Battery Service (0x180F)"]
        S3["Heart Rate Service (0x180D)"]
        S4["Custom Control Service (0xFFF0)"]
    end

    subgraph CHARACTERISTICS["Characteristics (Value + Properties)"]
        C1["Device Name (0x2A00)\n[READ] 'PulseGlow BLE'"]
        C2["Battery Level (0x2A19)\n[READ, NOTIFY] 92%"]
        C3["Heart Rate Measurement (0x2A37)\n[NOTIFY] Flags, BPM, RR"]
        C4["Body Sensor Location (0x2A38)\n[READ] 1 (Chest)"]
        C5["Mode Control (0xFFF1)\n[READ, WRITE] 0 (Resting)"]
    end

    subgraph DESCRIPTORS["Descriptors (Metadata & Config)"]
        D1["CCCD (0x2902)\nClient Characteristic Config"]
        D2["CCCD (0x2902)\nClient Characteristic Config"]
    end

    PROFILE --> S1 & S2 & S3 & S4
    S1 --> C1
    S2 --> C2
    S3 --> C3 & C4
    S4 --> C5
    C2 --> D1
    C3 --> D2
`
  },
  'connection-sequence': {
    title: 'Connection & Subscription Handshake',
    mmd: `sequenceDiagram
    autonumber
    actor User as User / App
    participant Central as Central (Web Client)
    participant Peripheral as Peripheral (Sensor)

    Note over Peripheral: GAP: Advertising on CH 37, 38, 39
    Peripheral->>Central: ADV_IND (Heart Rate 0x180D, RSSI -64dBm)
    User->>Central: Click Connect
    Central->>Peripheral: CONNECT_IND (Interval 20ms, Latency 0, Timeout 4s)
    Note over Central,Peripheral: Jump to Data Channels (FHSS Locked)

    Central->>Peripheral: ATT_EXCHANGE_MTU_REQ (Client MTU: 247)
    Peripheral->>Central: ATT_EXCHANGE_MTU_RSP (Server MTU: 247)

    Central->>Peripheral: ATT_READ_REQ [Handle 0x2A19: Battery Level]
    Peripheral->>Central: ATT_READ_RSP [Value: 0x5C (92%)]

    Central->>Peripheral: ATT_WRITE_REQ [Handle 0x2902: CCCD = 0x0001]
    Peripheral->>Central: ATT_WRITE_RSP [Write Success]

    loop Every 1000ms (Stream)
        Peripheral->>Central: ATT_HANDLE_VALUE_NTF [0x2A37: Flags, BPM, RR]
        Note over Central: Live ECG Waveform Chart Updated!
    end
`
  },
  'system-components': {
    title: 'Repository Architecture & Data Flow',
    mmd: `flowchart LR
    subgraph CENTRAL_TIER["Central / Client Tier"]
        WEB_APP["Web Client\n(web/index.html & app.js)"]
        EXPLAINER["Interactive Explainer\n(explainer/index.html)"]
        WEB_BT["Web Bluetooth API\n(navigator.bluetooth)"]
    end

    subgraph BRIDGE_TIER["Simulation & Transport Tier"]
        HTTP_SSE["Zero-Dependency Server\n(simulator/server.js)"]
        REST_API["REST Endpoints\n(/api/status, /api/gatt/*)"]
        SSE_STREAM["Server-Sent Events\n(/api/events)"]
    end

    subgraph PERIPHERAL_TIER["Peripheral Tier"]
        GATT_DB["Simulated GATT Database\n(Battery, HR, Custom Control)"]
        TELEMETRY["Telemetry Engine\n(simulator/telemetry.js)"]
        ESP32["Optional ESP32 Firmware\n(hardware/esp32/ble_peripheral.ino)"]
    end

    subgraph DATA_TIER["Visuals & Datasets"]
        DATASET["data/telemetry.sample.json"]
        PLOTS["docs/img/*.svg"]
    end

    WEB_APP <--> WEB_BT
    WEB_BT -. Physical BLE .-> ESP32
    WEB_APP <--> HTTP_SSE
    EXPLAINER <--> HTTP_SSE
    HTTP_SSE --> REST_API & SSE_STREAM
    REST_API & SSE_STREAM <--> GATT_DB
    GATT_DB --> TELEMETRY
    TELEMETRY --> DATASET
    DATASET --> PLOTS
`
  },
  'advertising-connection-timeline': {
    title: 'Advertising vs Connection Packet Timing',
    mmd: `flowchart TD
    subgraph ADVERTISING_PHASE["Phase 1: Periodic Advertising (Asynchronous)"]
        A1["Sleep (Radio OFF) ~98ms"] --> A2["TX on CH 37 (2402 MHz)"]
        A2 --> A3["T_IFS (150 μs)"]
        A3 --> A4["TX on CH 38 (2426 MHz)"]
        A4 --> A5["T_IFS (150 μs)"]
        A5 --> A6["TX on CH 39 (2480 MHz)"]
        A6 --> A1
    end

    subgraph CONNECTION_PHASE["Phase 2: Connected Events (Synchronous FHSS)"]
        C1["Connection Anchor (t = 0ms)"] --> C2["Central Packet TX (Data CH n)"]
        C2 --> C3["T_IFS (150 μs)"]
        C3 --> C4["Peripheral Packet RX & Reply"]
        C4 --> C5["Sleep until next Connection Event (t = 20ms)"]
        C5 --> C1
    end

    ADVERTISING_PHASE -. CONNECT_IND .-> CONNECTION_PHASE
`
  }
};

function writeMermaidSources() {
  for (const [name, info] of Object.entries(MERMAID_DIAGRAMS)) {
    const filePath = path.join(DIAGRAMS_DIR, `${name}.mmd`);
    fs.writeFileSync(filePath, info.mmd.trim() + '\n', 'utf-8');
    console.log(`[Diagrams] Wrote Mermaid source -> ${filePath}`);

    // Render crisp SVG fallback
    renderDiagramSvg(name, info);
  }
}

function renderDiagramSvg(name, info) {
  const w = 820;
  const h = 460;
  let bodySvg = '';

  if (name === 'gap-state-machine') {
    bodySvg = `
      <g transform="translate(60, 80)">
        <rect x="0" y="0" width="160" height="60" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="2" />
        <text x="80" y="35" text-anchor="middle" class="text-title" font-size="14">STANDBY</text>
        
        <path d="M 160 30 L 260 30" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
        <text x="210" y="22" text-anchor="middle" class="text-subtitle">Enable Adv</text>

        <rect x="270" y="0" width="160" height="60" rx="8" fill="#1e293b" stroke="#10b981" stroke-width="2" />
        <text x="350" y="35" text-anchor="middle" class="text-title" font-size="14">ADVERTISING</text>

        <path d="M 430 30 L 530 30" stroke="#a855f7" stroke-width="2" marker-end="url(#arrow)" />
        <text x="480" y="22" text-anchor="middle" class="text-subtitle">CONNECT_IND</text>

        <rect x="540" y="0" width="160" height="60" rx="8" fill="#1e293b" stroke="#a855f7" stroke-width="2" />
        <text x="620" y="35" text-anchor="middle" class="text-title" font-size="14">CONNECTED</text>

        <path d="M 80 60 L 80 160 L 260 160" stroke="#f59e0b" stroke-width="2" fill="none" marker-end="url(#arrow)" />
        <text x="140" y="150" text-anchor="middle" class="text-subtitle">Start Scan</text>

        <rect x="270" y="130" width="160" height="60" rx="8" fill="#1e293b" stroke="#f59e0b" stroke-width="2" />
        <text x="350" y="165" text-anchor="middle" class="text-title" font-size="14">SCANNING</text>

        <path d="M 430 160 L 530 160" stroke="#f59e0b" stroke-width="2" marker-end="url(#arrow)" />
        <text x="480" y="150" text-anchor="middle" class="text-subtitle">Packet Heard</text>

        <rect x="540" y="130" width="160" height="60" rx="8" fill="#1e293b" stroke="#f59e0b" stroke-width="2" />
        <text x="620" y="165" text-anchor="middle" class="text-title" font-size="14">INITIATING</text>

        <path d="M 620 130 L 620 60" stroke="#a855f7" stroke-width="2" marker-end="url(#arrow)" />
      </g>
    `;
  } else if (name === 'ble-stack-layers') {
    bodySvg = `
      <g transform="translate(60, 75)">
        <rect x="0" y="0" width="700" height="50" rx="6" fill="#1e293b" stroke="#38bdf8" />
        <text x="350" y="30" text-anchor="middle" class="text-title" font-size="13">APPLICATION &bull; Web Bluetooth API / Fitness App</text>

        <rect x="0" y="60" width="700" height="50" rx="6" fill="#1e293b" stroke="#10b981" />
        <text x="350" y="90" text-anchor="middle" class="text-title" font-size="13">GATT / GAP &bull; Services, Characteristics, Roles (0x180D, 0x180F)</text>

        <rect x="0" y="120" width="700" height="50" rx="6" fill="#1e293b" stroke="#a855f7" />
        <text x="350" y="150" text-anchor="middle" class="text-title" font-size="13">ATT &bull; Attribute Protocol (Read, Write, Notify, MTU 23-247)</text>

        <rect x="0" y="180" width="700" height="50" rx="6" fill="#1e293b" stroke="#f59e0b" />
        <text x="350" y="210" text-anchor="middle" class="text-title" font-size="13">L2CAP &bull; Logical Link Control and Adaptation Protocol</text>

        <rect x="0" y="240" width="700" height="50" rx="6" fill="#1e293b" stroke="#38bdf8" />
        <text x="350" y="270" text-anchor="middle" class="text-title" font-size="13">LINK LAYER &bull; State Machine, FHSS (37 Data Channels), Timing Anchor</text>

        <rect x="0" y="300" width="700" height="50" rx="6" fill="#1e293b" stroke="#64748b" />
        <text x="350" y="330" text-anchor="middle" class="text-title" font-size="13">PHYSICAL LAYER (PHY) &bull; 2.4 GHz GFSK Radio, 1 Mbps</text>
      </g>
    `;
  } else if (name === 'system-components') {
    bodySvg = `
      <g transform="translate(40, 75)">
        <!-- Tier 1: Client -->
        <rect x="0" y="0" width="220" height="230" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" />
        <rect x="0" y="0" width="220" height="32" rx="8" fill="#0284c7" />
        <text x="110" y="21" text-anchor="middle" class="text-title" font-size="12">CENTRAL / CLIENT TIER</text>
        <rect x="15" y="45" width="190" height="45" rx="6" fill="#0f172a" stroke="#334155" />
        <text x="110" y="65" text-anchor="middle" class="text-title" font-size="11">Web Bluetooth Client</text>
        <text x="110" y="80" text-anchor="middle" class="text-subtitle">web/index.html &amp; app.js</text>

        <rect x="15" y="100" width="190" height="45" rx="6" fill="#0f172a" stroke="#334155" />
        <text x="110" y="120" text-anchor="middle" class="text-title" font-size="11">Interactive Explainer</text>
        <text x="110" y="135" text-anchor="middle" class="text-subtitle">explainer/index.html</text>

        <rect x="15" y="155" width="190" height="55" rx="6" fill="#0f172a" stroke="#334155" />
        <text x="110" y="176" text-anchor="middle" class="text-title" font-size="11">Web Bluetooth API</text>
        <text x="110" y="195" text-anchor="middle" class="text-subtitle">navigator.bluetooth</text>

        <!-- Arrows: Client to Bridge -->
        <path d="M 220 70 L 275 70" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
        <path d="M 275 90 L 220 90" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
        <text x="248" y="62" text-anchor="middle" class="text-label" font-size="9">REST</text>
        <text x="248" y="105" text-anchor="middle" class="text-label" font-size="9">SSE</text>

        <!-- Tier 2: Server Bridge -->
        <rect x="280" y="0" width="210" height="230" rx="8" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
        <rect x="280" y="0" width="210" height="32" rx="8" fill="#059669" />
        <text x="385" y="21" text-anchor="middle" class="text-title" font-size="12">SIMULATION BRIDGE</text>
        <rect x="295" y="45" width="180" height="50" rx="6" fill="#0f172a" stroke="#334155" />
        <text x="385" y="67" text-anchor="middle" class="text-title" font-size="11">Zero-Dep HTTP Server</text>
        <text x="385" y="83" text-anchor="middle" class="text-subtitle">simulator/server.js (:3333)</text>

        <rect x="295" y="105" width="180" height="50" rx="6" fill="#0f172a" stroke="#334155" />
        <text x="385" y="127" text-anchor="middle" class="text-title" font-size="11">Server-Sent Events</text>
        <text x="385" y="143" text-anchor="middle" class="text-subtitle">/api/events (Live Stream)</text>

        <rect x="295" y="165" width="180" height="50" rx="6" fill="#0f172a" stroke="#334155" />
        <text x="385" y="187" text-anchor="middle" class="text-title" font-size="11">GATT REST Endpoints</text>
        <text x="385" y="203" text-anchor="middle" class="text-subtitle">/api/gatt/read &amp; write</text>

        <!-- Arrows: Bridge to Peripheral -->
        <path d="M 490 80 L 535 80" stroke="#10b981" stroke-width="2" marker-end="url(#arrow)" />
        <path d="M 535 120 L 490 120" stroke="#10b981" stroke-width="2" marker-end="url(#arrow)" />

        <!-- Tier 3: Peripheral & Telemetry -->
        <rect x="540" y="0" width="200" height="230" rx="8" fill="#1e293b" stroke="#a855f7" stroke-width="1.5" />
        <rect x="540" y="0" width="200" height="32" rx="8" fill="#7e22ce" />
        <text x="640" y="21" text-anchor="middle" class="text-title" font-size="12">PERIPHERAL &amp; TELEMETRY</text>
        <rect x="555" y="45" width="170" height="50" rx="6" fill="#0f172a" stroke="#334155" />
        <text x="640" y="67" text-anchor="middle" class="text-title" font-size="11">Simulated GATT DB</text>
        <text x="640" y="83" text-anchor="middle" class="text-subtitle">0x1800, 0x180F, 0x180D</text>

        <rect x="555" y="105" width="170" height="50" rx="6" fill="#0f172a" stroke="#334155" />
        <text x="640" y="127" text-anchor="middle" class="text-title" font-size="11">Telemetry Engine</text>
        <text x="640" y="143" text-anchor="middle" class="text-subtitle">simulator/telemetry.js</text>

        <rect x="555" y="165" width="170" height="50" rx="6" fill="#0f172a" stroke="#334155" />
        <text x="640" y="187" text-anchor="middle" class="text-title" font-size="11">Vector Plotter</text>
        <text x="640" y="203" text-anchor="middle" class="text-subtitle">scripts/generate-plots.js</text>

        <!-- Tier 4: Hardware Track (Bottom) -->
        <rect x="150" y="255" width="440" height="70" rx="8" fill="#1e293b" stroke="#f59e0b" stroke-width="1.5" />
        <rect x="150" y="255" width="440" height="24" rx="8" fill="#b45309" />
        <text x="370" y="271" text-anchor="middle" class="text-title" font-size="11">OPTIONAL HARDWARE TRACK (ESP32)</text>
        <text x="370" y="295" text-anchor="middle" class="text-title" font-size="11">Physical BLE Peripheral &bull; hardware/esp32/ble_peripheral.ino</text>
        <text x="370" y="312" text-anchor="middle" class="text-subtitle">Pairs with Web Bluetooth Client via Physical 2.4 GHz GFSK Radio</text>

        <!-- Hardware link to Web Bluetooth -->
        <path d="M 150 290 L 110 290 L 110 215" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4" marker-end="url(#arrow)" />
        <text x="80" y="260" text-anchor="middle" class="text-label" font-size="9" fill="#f59e0b">Real BLE</text>
      </g>
    `;
  } else if (name === 'gatt-hierarchy') {
    bodySvg = `
      <g transform="translate(40, 75)">
        <!-- Top Profile -->
        <rect x="250" y="0" width="240" height="38" rx="6" fill="#0284c7" stroke="#38bdf8" />
        <text x="370" y="24" text-anchor="middle" class="text-title" font-size="13">Heart Rate Profile (HRP)</text>

        <!-- Connecting lines -->
        <path d="M 370 38 L 370 65 L 80 65 L 80 85" stroke="#38bdf8" stroke-width="1.5" />
        <path d="M 370 65 L 260 65 L 260 85" stroke="#38bdf8" stroke-width="1.5" />
        <path d="M 370 65 L 480 65 L 480 85" stroke="#38bdf8" stroke-width="1.5" />
        <path d="M 370 65 L 660 65 L 660 85" stroke="#38bdf8" stroke-width="1.5" />

        <!-- 4 Services -->
        <rect x="5" y="85" width="150" height="45" rx="6" fill="#1e293b" stroke="#10b981" />
        <text x="80" y="104" text-anchor="middle" class="text-title" font-size="11">Generic Access</text>
        <text x="80" y="120" text-anchor="middle" class="text-subtitle">0x1800 (SIG Standard)</text>

        <rect x="185" y="85" width="150" height="45" rx="6" fill="#1e293b" stroke="#10b981" />
        <text x="260" y="104" text-anchor="middle" class="text-title" font-size="11">Battery Service</text>
        <text x="260" y="120" text-anchor="middle" class="text-subtitle">0x180F (SIG Standard)</text>

        <rect x="385" y="85" width="190" height="45" rx="6" fill="#1e293b" stroke="#10b981" stroke-width="2" />
        <text x="480" y="104" text-anchor="middle" class="text-title" font-size="11">Heart Rate Service</text>
        <text x="480" y="120" text-anchor="middle" class="text-subtitle">0x180D (Primary Target)</text>

        <rect x="595" y="85" width="140" height="45" rx="6" fill="#1e293b" stroke="#a855f7" />
        <text x="665" y="104" text-anchor="middle" class="text-title" font-size="11">Custom Control</text>
        <text x="665" y="120" text-anchor="middle" class="text-subtitle">0xFFF0 (128-bit Vendor)</text>

        <!-- Characteristics -->
        <!-- Under Generic Access -->
        <path d="M 80 130 L 80 160" stroke="#64748b" stroke-width="1.5" />
        <rect x="5" y="160" width="150" height="48" rx="6" fill="#0f172a" stroke="#334155" />
        <text x="80" y="180" text-anchor="middle" class="text-title" font-size="10">Device Name (0x2A00)</text>
        <text x="80" y="196" text-anchor="middle" class="text-subtitle">[READ] 'PulseGlow BLE'</text>

        <!-- Under Battery -->
        <path d="M 260 130 L 260 160" stroke="#64748b" stroke-width="1.5" />
        <rect x="185" y="160" width="150" height="48" rx="6" fill="#0f172a" stroke="#334155" />
        <text x="260" y="180" text-anchor="middle" class="text-title" font-size="10">Battery Level (0x2A19)</text>
        <text x="260" y="196" text-anchor="middle" class="text-subtitle">[READ, NOTIFY] 92%</text>

        <!-- Under Heart Rate -->
        <path d="M 450 130 L 450 160" stroke="#64748b" stroke-width="1.5" />
        <rect x="360" y="160" width="175" height="48" rx="6" fill="#0f172a" stroke="#38bdf8" />
        <text x="447" y="180" text-anchor="middle" class="text-title" font-size="10">HR Measurement (0x2A37)</text>
        <text x="447" y="196" text-anchor="middle" class="text-subtitle">[NOTIFY] Flags, BPM, RR</text>

        <path d="M 545 130 L 545 160" stroke="#64748b" stroke-width="1.5" />
        <rect x="540" y="160" width="100" height="48" rx="6" fill="#0f172a" stroke="#334155" />
        <text x="590" y="180" text-anchor="middle" class="text-title" font-size="10">Location (0x2A38)</text>
        <text x="590" y="196" text-anchor="middle" class="text-subtitle">[READ] 1=Chest</text>

        <!-- Under Custom -->
        <path d="M 665 130 L 665 160" stroke="#64748b" stroke-width="1.5" />
        <rect x="645" y="160" width="95" height="48" rx="6" fill="#0f172a" stroke="#334155" />
        <text x="692" y="180" text-anchor="middle" class="text-title" font-size="10">Mode (0xFFF1)</text>
        <text x="692" y="196" text-anchor="middle" class="text-subtitle">[WRITE] 0-2</text>

        <!-- CCCD Descriptors -->
        <path d="M 447 208 L 447 240" stroke="#f59e0b" stroke-width="1.5" />
        <rect x="350" y="240" width="195" height="42" rx="6" fill="#1e293b" stroke="#f59e0b" />
        <text x="447" y="258" text-anchor="middle" class="text-title" font-size="10" fill="#f59e0b">CCCD Descriptor (0x2902)</text>
        <text x="447" y="272" text-anchor="middle" class="text-subtitle">Write 0x0001 to enable streaming</text>
      </g>
    `;
  } else if (name === 'connection-sequence') {
    bodySvg = `
      <g transform="translate(50, 75)">
        <!-- Lifelines -->
        <rect x="50" y="0" width="180" height="32" rx="6" fill="#0284c7" />
        <text x="140" y="21" text-anchor="middle" class="text-title" font-size="12">CENTRAL (Web Client)</text>
        <line x1="140" y1="32" x2="140" y2="330" stroke="#334155" stroke-dasharray="4" />

        <rect x="490" y="0" width="180" height="32" rx="6" fill="#059669" />
        <text x="580" y="21" text-anchor="middle" class="text-title" font-size="12">PERIPHERAL (Sensor)</text>
        <line x1="580" y1="32" x2="580" y2="330" stroke="#334155" stroke-dasharray="4" />

        <!-- 1. ADV_IND -->
        <path d="M 580 60 L 145 60" stroke="#38bdf8" stroke-width="1.8" marker-end="url(#arrow)" />
        <text x="360" y="53" text-anchor="middle" class="text-label" font-size="10">1. ADV_IND (Heart Rate 0x180D, RSSI -64 dBm) [CH 37, 38, 39]</text>

        <!-- 2. CONNECT_IND -->
        <path d="M 140 95 L 575 95" stroke="#a855f7" stroke-width="1.8" marker-end="url(#arrow)" />
        <text x="360" y="88" text-anchor="middle" class="text-label" font-size="10">2. CONNECT_IND (Interval 20ms, Latency 0, Timeout 4s)</text>

        <!-- 3. MTU Exchange -->
        <path d="M 140 130 L 575 130" stroke="#10b981" stroke-width="1.5" marker-end="url(#arrow)" />
        <text x="360" y="123" text-anchor="middle" class="text-label" font-size="10">3. ATT_EXCHANGE_MTU_REQ (Client MTU: 247)</text>
        <path d="M 580 150 L 145 150" stroke="#10b981" stroke-width="1.5" marker-end="url(#arrow)" />
        <text x="360" y="145" text-anchor="middle" class="text-label" font-size="10">4. ATT_EXCHANGE_MTU_RSP (Server MTU: 247)</text>

        <!-- 4. Read Battery -->
        <path d="M 140 185 L 575 185" stroke="#38bdf8" stroke-width="1.5" marker-end="url(#arrow)" />
        <text x="360" y="178" text-anchor="middle" class="text-label" font-size="10">5. ATT_READ_REQ [Handle 0x2A19: Battery Level]</text>
        <path d="M 580 205 L 145 205" stroke="#38bdf8" stroke-width="1.5" marker-end="url(#arrow)" />
        <text x="360" y="200" text-anchor="middle" class="text-label" font-size="10">6. ATT_READ_RSP [Value: 0x5C = 92%]</text>

        <!-- 5. CCCD Write -->
        <path d="M 140 240 L 575 240" stroke="#f59e0b" stroke-width="1.8" marker-end="url(#arrow)" />
        <text x="360" y="233" text-anchor="middle" class="text-label" font-size="10" fill="#f59e0b">7. ATT_WRITE_REQ [Handle 0x2902 (CCCD) = 0x0001 (Enable Notify)]</text>
        <path d="M 580 260 L 145 260" stroke="#f59e0b" stroke-width="1.5" marker-end="url(#arrow)" />
        <text x="360" y="255" text-anchor="middle" class="text-label" font-size="10">8. ATT_WRITE_RSP [Write Success]</text>

        <!-- 6. Notifications Stream -->
        <rect x="110" y="275" width="500" height="42" rx="4" fill="rgba(244, 63, 94, 0.12)" stroke="#f43f5e" stroke-dasharray="3" />
        <path d="M 580 295 L 145 295" stroke="#f43f5e" stroke-width="2" marker-end="url(#arrow)" />
        <text x="360" y="291" text-anchor="middle" class="text-label" font-size="10" fill="#f43f5e">9. ATT_HANDLE_VALUE_NTF [0x2A37: Flags, BPM=74, RR=820ms] (Live Stream)</text>
        <text x="360" y="307" text-anchor="middle" class="text-subtitle">Repeats every 1000ms &bull; Zero client polling overhead</text>
      </g>
    `;
  } else if (name === 'advertising-connection-timeline') {
    bodySvg = `
      <g transform="translate(40, 75)">
        <!-- Track 1: Advertising -->
        <rect x="0" y="0" width="740" height="110" rx="8" fill="#1e293b" stroke="#38bdf8" />
        <text x="20" y="25" class="text-title" font-size="12">PHASE 1: PERIODIC ADVERTISING (Asynchronous Radio Bursts)</text>

        <rect x="20" y="45" width="130" height="45" rx="4" fill="#0f172a" stroke="#64748b" />
        <text x="85" y="65" text-anchor="middle" class="text-title" font-size="10">Deep Sleep</text>
        <text x="85" y="80" text-anchor="middle" class="text-subtitle">~98 ms (&lt; 2 &mu;A)</text>

        <path d="M 150 67 L 175 67" stroke="#38bdf8" stroke-width="1.5" marker-end="url(#arrow)" />

        <rect x="180" y="45" width="75" height="45" rx="4" fill="#0284c7" />
        <text x="217" y="65" text-anchor="middle" class="text-title" font-size="10">CH 37</text>
        <text x="217" y="80" text-anchor="middle" class="text-subtitle">2402 MHz</text>

        <text x="272" y="70" text-anchor="middle" class="text-subtitle" font-size="9">150 &mu;s</text>

        <rect x="290" y="45" width="75" height="45" rx="4" fill="#059669" />
        <text x="327" y="65" text-anchor="middle" class="text-title" font-size="10">CH 38</text>
        <text x="327" y="80" text-anchor="middle" class="text-subtitle">2426 MHz</text>

        <text x="382" y="70" text-anchor="middle" class="text-subtitle" font-size="9">150 &mu;s</text>

        <rect x="400" y="45" width="75" height="45" rx="4" fill="#7e22ce" />
        <text x="437" y="65" text-anchor="middle" class="text-title" font-size="10">CH 39</text>
        <text x="437" y="80" text-anchor="middle" class="text-subtitle">2480 MHz</text>

        <path d="M 475 67 L 515 67" stroke="#38bdf8" stroke-width="1.5" marker-end="url(#arrow)" />

        <rect x="520" y="45" width="200" height="45" rx="4" fill="#0f172a" stroke="#64748b" />
        <text x="620" y="65" text-anchor="middle" class="text-title" font-size="10">Deep Sleep until next event</text>
        <text x="620" y="80" text-anchor="middle" class="text-subtitle">Total On-Air Time &lt; 2.5 ms (97.5% Sleep!)</text>

        <!-- Downward Handshake Arrow -->
        <path d="M 437 90 L 437 130" stroke="#f59e0b" stroke-width="2" marker-end="url(#arrow)" />
        <text x="495" y="115" class="text-label" font-size="10" fill="#f59e0b">CONNECT_IND</text>

        <!-- Track 2: Connected Events -->
        <rect x="0" y="140" width="740" height="135" rx="8" fill="#1e293b" stroke="#10b981" />
        <text x="20" y="165" class="text-title" font-size="12">PHASE 2: SYNCHRONIZED CONNECTION EVENTS (Frequency Hopping FHSS)</text>

        <rect x="20" y="185" width="100" height="60" rx="4" fill="#0f172a" stroke="#10b981" />
        <text x="70" y="210" text-anchor="middle" class="text-title" font-size="10">Anchor Point</text>
        <text x="70" y="225" text-anchor="middle" class="text-subtitle">t = 0.0 ms</text>

        <path d="M 120 215 L 145 215" stroke="#10b981" stroke-width="1.5" marker-end="url(#arrow)" />

        <rect x="150" y="185" width="110" height="60" rx="4" fill="#0284c7" />
        <text x="205" y="210" text-anchor="middle" class="text-title" font-size="10">Central TX</text>
        <text x="205" y="225" text-anchor="middle" class="text-subtitle">Data CH n (0-36)</text>

        <text x="282" y="218" text-anchor="middle" class="text-subtitle" font-size="9">150 &mu;s T_IFS</text>

        <rect x="305" y="185" width="110" height="60" rx="4" fill="#059669" />
        <text x="360" y="210" text-anchor="middle" class="text-title" font-size="10">Peripheral RX/TX</text>
        <text x="360" y="225" text-anchor="middle" class="text-subtitle">Data reply / ACK</text>

        <path d="M 415 215 L 445 215" stroke="#10b981" stroke-width="1.5" marker-end="url(#arrow)" />

        <rect x="450" y="185" width="140" height="60" rx="4" fill="#0f172a" stroke="#64748b" />
        <text x="520" y="210" text-anchor="middle" class="text-title" font-size="10">Radio Sleep</text>
        <text x="520" y="225" text-anchor="middle" class="text-subtitle">Wait for next interval</text>

        <path d="M 590 215 L 615 215" stroke="#10b981" stroke-width="1.5" marker-end="url(#arrow)" />

        <rect x="620" y="185" width="105" height="60" rx="4" fill="#0f172a" stroke="#10b981" />
        <text x="672" y="210" text-anchor="middle" class="text-title" font-size="10">Next Event</text>
        <text x="672" y="225" text-anchor="middle" class="text-subtitle">t = 20.0 ms (Hop!)</text>
      </g>
    `;
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
    </marker>
  </defs>
  <style>
    .bg { fill: #0f172a; }
    .text-title { font-family: system-ui, sans-serif; font-weight: 700; fill: #f8fafc; }
    .text-subtitle { font-family: system-ui, sans-serif; font-size: 11px; fill: #94a3b8; }
    .text-label { font-family: ui-monospace, monospace; font-size: 11px; fill: #94a3b8; }
  </style>
  <rect width="${w}" height="${h}" rx="10" class="bg" />
  <text x="40" y="34" class="text-title">${info.title}</text>
  <text x="40" y="50" class="text-subtitle">BLE Demystified Architecture Series &bull; docs/diagrams/${name}.mmd</text>
  ${bodySvg}
</svg>`;

  fs.writeFileSync(path.join(IMG_DIR, `${name}.svg`), svg);
  console.log(`[Diagrams] Rendered diagram SVG -> ${path.join(IMG_DIR, `${name}.svg`)}`);
}

// =========================================================================
// MAIN RUNNER
// =========================================================================
function main() {
  console.log('[Generator] Generating all 5 telemetry SVG plots...');
  generatePlotRssiTime();
  generatePlotJitterHistogram();
  generatePlotHeartRateWave();
  generatePlotThroughputMtu();
  generatePlotPacketTimeline();

  console.log('[Generator] Writing Mermaid diagrams & SVGs...');
  writeMermaidSources();

  console.log('[Generator] All diagrams and plots generated successfully!');
}

if (require.main === module) {
  main();
}

module.exports = { main };
