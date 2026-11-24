import os

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# 1. Root index.html for GitHub Pages Welcome Portal
with open(os.path.join(repo_root, "index.html"), "w", encoding="utf-8") as f:
    f.write("""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BLE Demystified | How Bluetooth Low Energy Actually Works</title>
  <meta name="description" content="A visual, interactive, zero-hardware educational guide to Bluetooth Low Energy (BLE). Explore animated radio packets, GATT trees, real telemetry, and a live Web Bluetooth client.">
  <style>
    :root {
      --bg: #0a0f1d;
      --card-bg: #131b2e;
      --border: #23314d;
      --accent: #38bdf8;
      --accent-glow: rgba(56, 189, 248, 0.25);
      --text: #f8fafc;
      --muted: #94a3b8;
      --font: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: ui-monospace, Menlo, Monaco, Consolas, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .hero {
      text-align: center;
      padding: 4rem 1.5rem 2.5rem;
      max-width: 900px;
      margin: 0 auto;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--accent);
      background: var(--accent-glow);
      border: 1px solid rgba(56, 189, 248, 0.4);
      padding: 0.35rem 0.85rem;
      border-radius: 20px;
      margin-bottom: 1.25rem;
    }
    h1 {
      font-size: clamp(2rem, 5vw, 3.2rem);
      font-weight: 800;
      line-height: 1.15;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #ffffff 40%, var(--accent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.subtitle {
      font-size: 1.15rem;
      color: var(--muted);
      max-width: 720px;
      margin: 0 auto 2.5rem;
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.5rem;
      max-width: 1050px;
      margin: 0 auto;
      padding: 0 1.5rem 3rem;
      width: 100%;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
      text-decoration: none;
      color: inherit;
    }
    .card:hover {
      transform: translateY(-4px);
      border-color: var(--accent);
      box-shadow: 0 8px 30px var(--accent-glow);
    }
    .card-icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    .card h2 {
      font-size: 1.4rem;
      margin-bottom: 0.6rem;
      color: var(--text);
    }
    .card p {
      font-size: 0.95rem;
      color: var(--muted);
      margin-bottom: 1.5rem;
      flex: 1;
    }
    .card-action {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--accent);
    }
    .card-action span {
      transition: transform 0.2s ease;
    }
    .card:hover .card-action span {
      transform: translateX(4px);
    }
    .specs-strip {
      max-width: 1050px;
      margin: 0 auto 4rem;
      padding: 0 1.5rem;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      width: 100%;
    }
    .spec-item {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }
    .spec-num {
      font-family: var(--font-mono);
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--accent);
      margin-bottom: 0.2rem;
    }
    .spec-lbl {
      font-size: 0.8rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    footer {
      margin-top: auto;
      text-align: center;
      padding: 1.5rem;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: 0.85rem;
    }
    footer a { color: var(--accent); text-decoration: none; }
    footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <main class="hero">
    <div class="badge">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C11.45 2 11 2.45 11 3v7.09L7.41 6.5 6 7.91 10.59 12.5 6 17.09 7.41 18.5 11 14.91V21c0 .55.45 1 1 1s1-.45 1-1v-6.09l3.59 3.59 1.41-1.41L13.41 12.5 18 7.91 16.59 6.5 13 10.09V3c0-.55-.45-1-1-1zm1 4.83l2.17 2.17L13 11.17V6.83zm0 7.34l2.17 2.17L13 18.17v-4.34z"/></svg>
      <span>Open Source BLE Educational Hub</span>
    </div>
    <h1>How Bluetooth Low Energy Actually Works</h1>
    <p class="subtitle">
      Demystifying the radio protocol that powers smartwatches, fitness straps, and air tags. Zero proprietary hardware required. Everything runnable directly in your browser.
    </p>
  </main>

  <section class="cards-grid">
    <!-- Card 1: Interactive Explainer -->
    <a href="explainer/" class="card">
      <div>
        <div class="card-icon">⚡</div>
        <h2>1. Interactive Explainer</h2>
        <p>
          A single-page visual guide with 7 interactive sections: step through animated 2.4 GHz radio packets across advertising channels, click through GAP states, explore the GATT tree, tune connection intervals, and test your knowledge with a quiz.
        </p>
      </div>
      <div class="card-action">Launch Interactive Explainer <span>&rarr;</span></div>
    </a>

    <!-- Card 2: Live Web Bluetooth Demo -->
    <a href="web/" class="card">
      <div>
        <div class="card-icon">📡</div>
        <h2>2. Live Web Bluetooth Client</h2>
        <p>
          Experience the full 6-step handshake live: scan, connect, list GATT services, read battery level, write workout controls, and subscribe to real-time heart rate notifications with an ECG pulse chart and raw ATT hex packet decoder.
        </p>
      </div>
      <div class="card-action">Launch Live Client <span>&rarr;</span></div>
    </a>

    <!-- Card 3: Deep Dive Docs -->
    <a href="docs/how-bluetooth-works.md" class="card">
      <div>
        <div class="card-icon">📖</div>
        <h2>3. Deep Dive Guide &amp; Docs</h2>
        <p>
          Read the complete protocol documentation explaining duty-cycling physics, FHSS frequency hopping, 16-bit vs 128-bit UUIDs, ATT MTU optimization, and the comprehensive BLE glossary.
        </p>
      </div>
      <div class="card-action">Read Documentation <span>&rarr;</span></div>
    </a>
  </section>

  <section class="specs-strip">
    <div class="spec-item">
      <div class="spec-num">3 Channels</div>
      <div class="spec-lbl">Advertising (37, 38, 39)</div>
    </div>
    <div class="spec-item">
      <div class="spec-num">37 Channels</div>
      <div class="spec-lbl">FHSS Data (0 &ndash; 36)</div>
    </div>
    <div class="spec-item">
      <div class="spec-num">20 ms</div>
      <div class="spec-lbl">Default Conn Interval</div>
    </div>
    <div class="spec-item">
      <div class="spec-num">Zero</div>
      <div class="spec-lbl">Hardware Required</div>
    </div>
  </section>

  <footer>
    <p>
      BLE Demystified &bull; Created by <a href="https://github.com/lunganlungpg">lunganlungpg</a> &bull;
      <a href="https://github.com/lunganlungpg/ble-demystified">View on GitHub</a> &bull;
      MIT License
    </p>
  </footer>
</body>
</html>
""")

# 2. hardware/esp32/README.md
with open(os.path.join(repo_root, "hardware", "esp32", "README.md"), "w", encoding="utf-8") as f:
    f.write("""# ESP32 Hardware Track: Physical BLE Peripheral

Want to test BLE Demystified with physical microcontrollers instead of the simulator?
This directory contains a complete, standard-compliant Arduino sketch that turns any ESP32 development board into a physical `"PulseGlow BLE"` peripheral.

---

## Supported Boards
- ESP32 DevKit v1 / NodeMCU-32S
- ESP32-WROOM-32
- ESP32-WROVER
- ESP32-C3 / ESP32-S3 (with ESP-IDF 4.4+ / Arduino ESP32 core 2.0+)

---

## Flashing Instructions

### Method A: Arduino IDE
1. Open Arduino IDE.
2. Ensure you have the **ESP32 board package** installed:
   - Go to **File > Preferences > Additional Board Manager URLs**:
     `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Open **Tools > Board > Boards Manager**, search for `esp32`, and install.
3. Open `ble_peripheral.ino`.
4. Select your board (e.g., **DOIT ESP32 DEVKIT V1**) and correct serial COM port.
5. Click **Upload**.

### Method B: PlatformIO (`platformio.ini`)
```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
```

---

## Testing with the Live Web Client
1. Open `web/index.html` in Google Chrome or Microsoft Edge (or use the hosted GitHub Pages link).
2. Change the dropdown at the top from **Simulated Peripheral** to **📡 Real Web Bluetooth**.
3. Click **Step 1: Scan**.
4. In the browser device picker prompt, select **PulseGlow BLE** and click **Pair**.
5. Watch the onboard LED on pin 2 light up when connected!
6. Click **Step 3 (Read Battery)**, click **Step 4 (Write Workout Mode)**, and **Step 5 (Subscribe)** to see physical notification packets streaming into your browser!

---

## Serial Monitor Output (115200 Baud)
```
==========================================
  PulseGlow BLE ESP32 Peripheral Starting
==========================================
[GAP] Advertising started on Channels 37, 38, 39.
[GAP] Open web/index.html in Chrome/Edge and click Scan!
[GAP] Central connected! Connection anchor locked.
[ATT Notify] Sent Heart Rate: 72 BPM (RR: 833 ms)
[ATT Notify] Sent Heart Rate: 74 BPM (RR: 810 ms)
[GATT] Received Mode write: 1
[ATT Notify] Sent Heart Rate: 125 BPM (RR: 480 ms)
```
""")

# 3. Comprehensive Polished README.md
with open(os.path.join(repo_root, "README.md"), "w", encoding="utf-8") as f:
    f.write("""# BLE Demystified: How Bluetooth Low Energy Actually Works

An interactive, visual, zero-hardware educational guide and live playground for Bluetooth Low Energy (BLE).

[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue?style=for-the-badge&logo=github)](https://lunganlungpg.github.io/ble-demystified/)
[![CI Workflow](https://img.shields.io/github/actions/workflow/status/lunganlungpg/ble-demystified/ci.yml?branch=main&style=for-the-badge&label=CI%20Build)](https://github.com/lunganlungpg/ble-demystified/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Zero Hardware Required](https://img.shields.io/badge/Hardware-None%20Required-success?style=for-the-badge)](#quickstart-in-3-commands)
[![Node 18+](https://img.shields.io/badge/Node.js-18%2B-informational?style=for-the-badge&logo=node.js)](https://nodejs.org)

Ever wondered how your fitness tracker or smartwatch whispers heart-rate readings to your phone without killing its battery before lunchtime? 

This repository breaks down the entire BLE protocol stack from **2.4 GHz radio chirps** to **Web Bluetooth JavaScript**, complete with:
- 🚀 **A Runnable Browser Demo:** 6-step live handshake with an animated pulse chart and raw ATT hex packet inspector.
- ⚡ **Interactive HTML Explainer:** 7 tabs featuring animated radio packets, a clickable GAP state machine, an interactive GATT tree, and a quiz.
- 📊 **Real Vector Telemetry Plots:** Publication-ready SVGs generated directly from the simulator's RF telemetry.
- 🛠️ **Optional Hardware Track:** ESP32 Arduino sketch that pairs seamlessly with the browser client.

---

## Table of Contents
- [Architecture at a Glance](#architecture-at-a-glance)
- [Quickstart in 3 Commands](#quickstart-in-3-commands)
- [Interactive Explainer Walkthrough](#interactive-explainer-walkthrough)
- [Visual Protocol Guide & Telemetry Plots](#visual-protocol-guide--telemetry-plots)
- [The 6-Step Web Bluetooth Demo](#the-6-step-web-bluetooth-demo)
- [Optional Hardware Track (ESP32)](#optional-hardware-track-esp32)
- [Troubleshooting & OS Notes](#troubleshooting--os-notes)
- [Documentation Deep Dives](#documentation-deep-dives)
- [Extending the Project](#extending-the-project)
- [License](#license)

---

## Architecture at a Glance

The repo is cleanly separated into client, simulation, telemetry, and documentation tiers:

![Architecture Diagram](docs/img/system-components.svg)

---

## Quickstart in 3 Commands

No hardware, dongles, or build chains required. All you need is Node.js 18+:

```bash
# 1. Clone this repository
git clone https://github.com/lunganlungpg/ble-demystified.git
cd ble-demystified/simulator

# 2. Start the zero-dependency GATT simulator & web server
node server.js

# 3. Open in your browser
# Live Web Client:        http://localhost:3333/web/
# Interactive Explainer:  http://localhost:3333/explainer/
```

Click **"▶ Run Full 6-Step Handshake"** in the web client to watch discovery, connection, reading battery, writing controls, and live heart rate streaming in action!

---

## Interactive Explainer Walkthrough

Located in [`explainer/`](explainer/), this responsive, dark/light single-page application breaks BLE down into 7 hands-on sections:

| Section | What You Can Do |
| :--- | :--- |
| **1. What is BLE?** | Step through animated radio packets (`ADV_IND`, `SCAN_REQ`, `SCAN_RSP`, `CONNECT_IND`) across advertising channels 37, 38, and 39 with Play/Pause and step controls. |
| **2. GAP States** | Clickable state diagram (Standby, Advertising, Scanning, Initiating, Connected) showing power draws (< 1.5 &mu;A in standby) and valid transitions. |
| **3. GATT Explorer** | Interactive tree view of Services, Characteristics, and CCCD Descriptors with 16-bit alias vs. 128-bit full UUID comparison. |
| **4. Live Simulator & Tuner** | Tune Connection Interval (7.5–200ms), ATT MTU size (23–247 bytes), and RF interference sliders to watch real-time latency and CR2032 battery life estimates. |
| **5. Read vs. Write vs. Notify** | Side-by-side interactive arenas that animate ATT request and response packets flying between Central and Peripheral. |
| **6. Plots Gallery** | Inspection view of all generated RF telemetry plots with key takeaways. |
| **7. Interactive Quiz** | 5 high-yield multiple-choice questions with instant feedback and explanations. |

---

## Visual Protocol Guide & Telemetry Plots

All plots and diagrams are vector SVGs generated into `docs/img/` by `scripts/generate-plots.js`.

### 1. GAP State Machine
![GAP State Machine](docs/img/gap-state-machine.svg)
> **What to notice:** Standby (radio asleep) transitions to either Advertising (Peripheral broadcaster) or Scanning (Central listener). A `CONNECT_IND` packet synchronizes the connection anchor.

### 2. BLE Protocol Layers
![BLE Protocol Layers](docs/img/ble-stack-layers.svg)
> **What to notice:** Clean separation between the Application/Profile layer, the Host (GAP, GATT, ATT, L2CAP), and the Controller (Link Layer and 2.4 GHz Physical PHY).

### 3. GATT Database Hierarchy
![GATT Hierarchy](docs/img/gatt-hierarchy.svg)
> **What to notice:** The standard Heart Rate Service (`0x180D`) and Battery Service (`0x180F`) use 16-bit UUID shortcuts, while custom control services use 128-bit vendor UUIDs.

### 4. Connection & Subscription Sequence
![Connection Sequence](docs/img/connection-sequence.svg)
> **What to notice:** Notifications require the Central to write `0x0001` to the CCCD descriptor (`0x2902`). Once enabled, notifications stream without any client polling.

### 5. Telemetry: RF Signal Strength (RSSI vs. Time)
![RSSI Plot](docs/img/plot-rssi-time.svg)
> **What to notice:** Natural &plusmn;4 dBm multipath fading occurs even in stationary setups due to reflections from walls, desks, and bodies.

### 6. Telemetry: Inter-Arrival Timing & Jitter Histogram
![Jitter Histogram](docs/img/plot-jitter-histogram.svg)
> **What to notice:** A sharp peak at exactly 20.0 ms matches the configured Connection Interval. The secondary tail at 40 ms represents Link Layer packet retransmissions.

### 7. Telemetry: Throughput vs. ATT MTU Size
![Throughput vs MTU](docs/img/plot-throughput-mtu.svg)
> **What to notice:** Negotiating MTU up from 23 bytes to 247 bytes delivers a **12x increase in throughput** with zero additional radio wakeups.

### 8. Telemetry: Protocol Gantt Timeline
![Packet Timeline](docs/img/plot-packet-timeline.svg)
> **What to notice:** The transition from asynchronous advertising channel contention to synchronized 20ms connection events.

---

## The 6-Step Web Bluetooth Demo

The client in [`web/`](web/) walks through the standard BLE lifecycle:

1. **Scan & Discover:** Listens for `ADV_IND` packets advertising the Heart Rate Service (`0x180D`).
2. **Connect & Discover GATT:** Connects and queries primary services and characteristics.
3. **Read Value (Battery):** Transmits `ATT_READ_REQ` to `0x2A19` and displays decoded percent + raw hex bytes.
4. **Write Characteristic:** Transmits `ATT_WRITE_CMD` to Mode Control (`0xFFF1`) to change simulation intensity.
5. **Subscribe to Notifications:** Writes `0x0001` to CCCD `0x2902`.
6. **Live Data Stream:** Receives continuous `ATT_HANDLE_VALUE_NTF` (opcode `0x1B`) packets, parses flags, BPM, and RR-intervals, and renders an animated pulse chart.

---

## Optional Hardware Track (ESP32)

Have an ESP32 board?
1. Open [`hardware/esp32/ble_peripheral.ino`](hardware/esp32/ble_peripheral.ino) in Arduino IDE or PlatformIO.
2. Flash it to your ESP32 board.
3. Open `web/index.html`, select **📡 Real Web Bluetooth**, click **Scan**, and pair directly with your physical board!
See [`hardware/esp32/README.md`](hardware/esp32/README.md) for pinouts and serial debug logs.

---

## Troubleshooting & OS Notes

| Platform / Issue | Solution |
| :--- | :--- |
| **Secure Context Required** | Web Bluetooth API requires `https://` or `http://localhost`. Opening `file:///` directly in the browser will disable `navigator.bluetooth`. |
| **User Gesture Requirement** | Browsers will block `requestDevice()` unless it is triggered directly by a user click. |
| **Google Chrome / Microsoft Edge** | Fully supported out-of-the-box on Windows 10/11, macOS, ChromeOS, and Android. |
| **Linux (BlueZ)** | Ensure `bluetoothd` is running. In Chrome, enable `chrome://flags/#enable-web-bluetooth-new-permissions-backend` if device pairing prompts fail. |
| **macOS** | Ensure Chrome/Edge has Bluetooth permission enabled under **System Settings > Privacy & Security > Bluetooth**. |
| **iOS / iPadOS** | Apple Safari does not natively support Web Bluetooth. Use the free **Bluefy** browser on the App Store to run Web Bluetooth on iOS. |

---

## Documentation Deep Dives

- [**How Bluetooth Works (docs/how-bluetooth-works.md)**](docs/how-bluetooth-works.md): Comprehensive deep dive from radio channels to CCCDs.
- [**Architecture (docs/architecture.md)**](docs/architecture.md): Internal design of the simulator, telemetry logger, and web client.
- [**Glossary (docs/glossary.md)**](docs/glossary.md): Plain-English definitions of GAP, GATT, ATT, L2CAP, MTU, RSSI, and CCCD.

---

## Extending the Project
1. **Environmental Sensing Service (0x181A):** Add temperature and humidity characteristics with diurnal curves.
2. **Web Bluetooth Web MIDI:** Implement simulated BLE MIDI note streams.
3. **AoA / AoD Direction Finding Visualizer:** Simulate Bluetooth 5.1 Constant Tone Extension (CTE) I/Q samples for micro-location tracking.

---

## License
Released under the permissive [MIT License](LICENSE). Built for educators, students, and engineers everywhere!
""")

print("[Polish] Root index.html, hardware/esp32/README.md, and README.md updated successfully!")
