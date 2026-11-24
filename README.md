# BLE Demystified: How Bluetooth Low Energy Actually Works

An interactive, visual, zero-hardware educational guide and live playground for Bluetooth Low Energy (BLE).

[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue?style=for-the-badge&logo=github)](https://lunganlungpg.github.io/ble-demystified/)
[![CI Workflow](https://img.shields.io/github/actions/workflow/status/lunganlungpg/ble-demystified/ci.yml?branch=main&style=for-the-badge&label=CI%20Build)](https://github.com/lunganlungpg/ble-demystified/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Zero Hardware Required](https://img.shields.io/badge/Hardware-None%20Required-success?style=for-the-badge)](#quickstart-in-3-commands)
[![Node 18+](https://img.shields.io/badge/Node.js-18%2B-informational?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](CONTRIBUTING.md)

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
