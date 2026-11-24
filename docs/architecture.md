# Architecture of BLE Demystified

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
