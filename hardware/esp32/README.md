# ESP32 Hardware Track: Physical BLE Peripheral

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
