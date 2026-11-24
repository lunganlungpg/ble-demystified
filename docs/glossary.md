# Bluetooth Low Energy Glossary

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
