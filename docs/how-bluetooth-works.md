# How Bluetooth Low Energy (BLE) Actually Works

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
