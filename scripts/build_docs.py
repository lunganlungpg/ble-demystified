import os

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
docs_dir = os.path.join(repo_root, "docs")
os.makedirs(docs_dir, exist_ok=True)

# 1. LICENSE
with open(os.path.join(repo_root, "LICENSE"), "w", encoding="utf-8") as f:
    f.write("""MIT License

Copyright (c) 2024 BLE Demystified Educational Authors

Permission is granted to use, copy, modify, and distribute this educational
software and documentation for any purpose without fee, provided this notice
remains intact. Provided as-is without warranties.
""")

# 2. CONTRIBUTING.md
with open(os.path.join(repo_root, "CONTRIBUTING.md"), "w", encoding="utf-8") as f:
    f.write("""# Contributing to BLE Demystified

Hey there! Thanks for helping make Bluetooth Low Energy clear and approachable for everyone.

## Core Philosophy
- Visual first: interactive diagrams and real telemetry plots beat dense specification PDFs.
- Zero friction: the default demo should run with zero hardware and zero native build toolchains.
- Casual & friendly: write for humans, explain concepts with analogies, avoid stuffy committee jargon.

## Local Development
1. Start the zero-dependency simulator:
   cd simulator
   node server.js
2. Open http://localhost:3333/web/ for the live client and http://localhost:3333/explainer/ for the interactive explainer.
3. Run unit tests: npm test (or node --test ../tests/*.test.js).
4. Regenerate plots: node scripts/generate-plots.js.
""")

# 3. docs/how-bluetooth-works.md
with open(os.path.join(docs_dir, "how-bluetooth-works.md"), "w", encoding="utf-8") as f:
    f.write("""# How Bluetooth Low Energy (BLE) Actually Works

A practical, conversational walkthrough of the BLE protocol for engineers and learners.

## 1. Why Classic Bluetooth Kills Batteries (and BLE Doesn't)
Classic Bluetooth creates an always-on, high-bandwidth radio stream (ideal for continuous audio).
Bluetooth Low Energy flips this model upside down:
- The radio sleeps 99% of the time, consuming under 2 microamps.
- It wakes up for 2 milliseconds, transmits a burst, and immediately sleeps again.
- This lets a coin-cell CR2032 battery power a fitness monitor for over a year.

## 2. Advertising & Discovery (GAP)
Before establishing a link, devices find each other using the Generic Access Profile (GAP).
BLE uses 40 channels across the 2.4 GHz band:
- Channels 0-36: Reserved for connected data transfer.
- Channels 37, 38, 39: Dedicated to advertising.
These three channels sit between Wi-Fi channels 1, 6, and 11 to avoid radio congestion.

### The Advertising Handshake
1. ADV_IND: The peripheral broadcasts its presence on channels 37, 38, and 39.
2. SCAN_REQ: The central (phone/browser) asks for additional device information.
3. SCAN_RSP: The peripheral returns its friendly name (e.g., 'PulseGlow BLE').
4. CONNECT_IND: The central sends connection timing parameters to lock synchronization.

## 3. Connected Mode & Frequency Hopping
Once connected, both radios jump to the 37 data channels using Frequency Hopping Spread Spectrum (FHSS).
Every connection interval (e.g., 20ms), the radios jump to a new channel together, dodging radio noise.

## 4. The GATT Data Tree
Data inside the peripheral is structured hierarchically:
- Profile: Collection of services (e.g., Heart Rate Profile).
- Service: Logical group of capabilities (e.g., Heart Rate Service 0x180D, Battery 0x180F).
- Characteristic: A data point (e.g., Heart Rate Measurement 0x2A37).
- Descriptor: Metadata or configuration (e.g., CCCD 0x2902 to enable notifications).

## 5. Operations: Read, Write, and Notify
- Read: Central queries a value (ATT_READ_REQ -> ATT_READ_RSP).
- Write: Central updates a value (ATT_WRITE_CMD or ATT_WRITE_REQ).
- Notify: Peripheral pushes real-time streams (ATT_HANDLE_VALUE_NTF) without client polling.
""")

# 4. docs/architecture.md
with open(os.path.join(docs_dir, "architecture.md"), "w", encoding="utf-8") as f:
    f.write("""# Architecture of BLE Demystified

This repository is designed with zero external runtime dependencies so that anyone can explore BLE in seconds.

## System Overview
1. Central Client (web/):
   - Written in plain HTML, CSS, and modern JavaScript.
   - Dual-mode connection: supports both the standard Web Bluetooth API (navigator.bluetooth) for physical devices/ESP32, and an HTTP/SSE bridge for zero-hardware simulation.
   - Displays live Chart.js waveform, raw hex ATT packet inspector, and real-time protocol logs.

2. Peripheral Simulator (simulator/):
   - Zero-dependency Node.js server (server.js) implementing a simulated GATT server.
   - Serves static files and streams live notifications via Server-Sent Events (/api/events).
   - Telemetry engine (telemetry.js) records RSSI, packet jitter, and timing stats.

3. Interactive Explainer (explainer/):
   - Single-page responsive web app with 7 interactive tabs:
     1. Animated Radio Flow
     2. GAP State Machine
     3. GATT Tree Explorer
     4. Live Simulator & Tuner
     5. Read vs Write vs Notify Playground
     6. Plots Gallery
     7. Interactive Quiz

4. Visualization Pipeline (scripts/generate-plots.js):
   - Reads telemetry and produces 5 crisp SVG plots and 6 rendered diagram SVGs into docs/img/.
""")

# 5. docs/glossary.md
with open(os.path.join(docs_dir, "glossary.md"), "w", encoding="utf-8") as f:
    f.write("""# Bluetooth Low Energy Glossary

A quick reference for common BLE terms and acronyms.

| Term | Meaning |
| :--- | :--- |
| **GAP** | Generic Access Profile: controls advertising, scanning, and connection states. |
| **GATT** | Generic Attribute Profile: defines how data is structured into Services and Characteristics. |
| **ATT** | Attribute Protocol: low-level client/server protocol with 16-bit handles and opcodes. |
| **Central** | The initiator of connections (e.g., phone or laptop). |
| **Peripheral** | The broadcaster that advertises data and accepts connections (e.g., sensor). |
| **UUID** | Universally Unique Identifier: standard 16-bit aliases or 128-bit full vendor identifiers. |
| **CCCD** | Client Characteristic Configuration Descriptor (0x2902): write 0x0001 to enable notifications. |
| **MTU** | Maximum Transmission Unit: maximum packet size (default 23 bytes). |
| **RSSI** | Received Signal Strength Indicator: measured in dBm (e.g., -60 dBm is good signal). |
| **Connection Interval** | Time between connection events (7.5ms to 4000ms). |
| **Slave Latency** | Number of connection events a peripheral may skip to save battery. |
| **Notification** | Fast, unacknowledged server-pushed data stream. |
| **Indication** | Acknowledged server-pushed data packet requiring a confirmation. |
""")

# 6. README.md
with open(os.path.join(repo_root, "README.md"), "w", encoding="utf-8") as f:
    f.write("""# BLE Demystified: How Bluetooth Low Energy Actually Works

An interactive, zero-hardware, beginner-friendly educational guide and live playground for Bluetooth Low Energy (BLE).

[![CI Tests](https://github.com/example/ble-demystified/actions/workflows/ci.yml/badge.svg)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Hardware Required](https://img.shields.io/badge/Hardware-None%20Required-success.svg)](#quickstart)
[![Node 18+](https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg)](https://nodejs.org)

Ever wondered how your fitness tracker or smartwatch whispers heart-rate readings to your phone without killing its battery before lunchtime? This repository breaks down the entire BLE protocol stack from radio waves to Web Bluetooth JavaScript, complete with a live browser demo, interactive visual explainer, and real RF telemetry plots.

---

## Architecture at a Glance

![Architecture Diagram](docs/img/system-components.svg)

---

## Quickstart (3 Commands)

You do not need an ESP32, dongle, or special hardware. You only need Node.js:

```bash
# 1. Clone this repository
git clone https://github.com/example/ble-demystified.git
cd ble-demystified/simulator

# 2. Start the zero-dependency GATT simulator & web server
node server.js

# 3. Open your browser
# Web Bluetooth Client:    http://localhost:3333/web/
# Interactive Explainer:   http://localhost:3333/explainer/
```

Hit the **"▶ Run Full 6-Step Handshake"** button on the web demo to watch discovery, connection, reading battery, writing controls, and live heart rate streaming in action!

---

## Interactive Explainer (explainer/)

The repo includes a full, responsive interactive single-page app in `explainer/` with 7 interactive sections:

1. **What is BLE?**: Step through animated 2.4 GHz radio packets across advertising channels 37, 38, and 39 with Play/Pause controls.
2. **GAP States**: Clickable state machine (Standby, Advertising, Scanning, Initiating, Connected) showing power draw and transitions.
3. **GATT Explorer**: Interactive tree view of Services, Characteristics, and CCCD Descriptors with 16-bit vs 128-bit UUID inspection.
4. **Live Simulator & Tuner**: Tune connection interval (ms), MTU size, and RF interference sliders to observe real-time latency and estimated CR2032 battery lifespan.
5. **Read vs Write vs Notify**: Side-by-side visual playgrounds animating packets traveling between Central and Peripheral.
6. **Plots Gallery**: Inspection view of all generated telemetry plots with key takeaways.
7. **Interactive Quiz**: 5 multiple-choice questions with instant feedback and explanations.

---

## Visual Protocol Guide

### 1. GAP State Machine
![GAP State Machine](docs/img/gap-state-machine.svg)
*Standby (radio sleep) transitions to Advertising or Scanning, then to Connected via CONNECT_IND.*

### 2. BLE Protocol Layers
![BLE Protocol Layers](docs/img/ble-stack-layers.svg)
*Application and Profiles down through GATT, ATT, L2CAP, and Link Layer to the physical 2.4 GHz PHY.*

### 3. GATT Database Hierarchy
![GATT Hierarchy](docs/img/gatt-hierarchy.svg)
*Real service and characteristic hierarchy implemented in our simulator and ESP32 sketch.*

### 4. Connection & Subscription Sequence
![Connection Sequence](docs/img/connection-sequence.svg)
*Step-by-step handshake from advertising packets to continuous notification streaming.*

### 5. Telemetry: RSSI vs. Time
![RSSI Plot](docs/img/plot-rssi-time.svg)
*Shows natural +/- 4 dBm multipath fading even in stationary office environments.*

### 6. Telemetry: Jitter Histogram
![Jitter Histogram](docs/img/plot-jitter-histogram.svg)
*Sharp peak at the 20ms Connection Interval, with secondary retransmission tails.*

### 7. Telemetry: Throughput vs. ATT MTU
![Throughput vs MTU](docs/img/plot-throughput-mtu.svg)
*Negotiating larger MTU sizes yields over 10x higher throughput with zero additional radio wakeups.*

---

## Optional Hardware Track: ESP32

Have an ESP32 board? You can flash our ready-to-use Arduino sketch:
1. Open `hardware/esp32/ble_peripheral.ino` in Arduino IDE or PlatformIO.
2. Select your ESP32 board and flash.
3. Switch the web client mode dropdown to **"📡 Real Web Bluetooth"** in Chrome or Edge, click **Scan**, and pair with your physical ESP32!

---

## Troubleshooting

- **Web Bluetooth Requirements:** Browser Web Bluetooth requires a secure context (`https://` or `http://localhost`) and must be triggered by a direct user gesture (clicking a button).
- **Supported Browsers:** Google Chrome, Microsoft Edge, Opera, or Chromium on Windows, macOS, Linux, and Android. (iOS Safari does not natively support Web Bluetooth; use Bluefy on iOS if testing real hardware).
- **Bluetooth Adapter:** Ensure your computer's Bluetooth radio is turned ON if testing real hardware mode. For simulated mode, no Bluetooth hardware or adapter is required!

---

## Project Roadmap
- [x] Zero-dependency simulated GATT server in Node.js
- [x] Dual-mode Web Bluetooth client (Real + Simulated)
- [x] Interactive 7-tab single-page educational explainer
- [x] Automated SVG plot and Mermaid diagram generation
- [x] ESP32 Arduino sketch for physical hardware track
- [ ] Add Environmental Sensing Service (0x181A) with temperature/humidity
- [ ] Add Web MIDI over BLE demo tab

---

## License
MIT License. Built for technical educators, hardware enthusiasts, and web developers everywhere!
""")

print("[Builder] All documentation files created successfully!")
