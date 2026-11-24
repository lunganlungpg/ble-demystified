/*
 * ble_peripheral.ino - Physical ESP32 Hardware Track for BLE Demystified
 *
 * Implements a real, standard-compliant BLE GATT Peripheral:
 * - Device Name: "PulseGlow BLE"
 * - Battery Service (0x180F) -> Battery Level (0x2A19) [Read, Notify]
 * - Heart Rate Service (0x180D) -> Measurement (0x2A37) [Notify + 0x2902 CCCD]
 *                               -> Body Sensor Location (0x2A38) [Read]
 *                               -> Control Point (0x2A39) [Write]
 * - Custom Service (0xFFF0)    -> Mode Control (0xFFF1) [Read, Write]
 *
 * Works with the web client (web/index.html) out of the box!
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define LED_PIN 2 // Built-in LED on most ESP32 DevKit boards

// Standard 16-bit BLE UUIDs mapped to 128-bit Base UUID
#define SERVICE_BATTERY_UUID        "0000180F-0000-1000-8000-00805F9B34FB"
#define CHAR_BATTERY_LEVEL_UUID     "00002A19-0000-1000-8000-00805F9B34FB"

#define SERVICE_HEART_RATE_UUID     "0000180D-0000-1000-8000-00805F9B34FB"
#define CHAR_HEART_RATE_MEAS_UUID   "00002A37-0000-1000-8000-00805F9B34FB"
#define CHAR_BODY_SENSOR_LOC_UUID   "00002A38-0000-1000-8000-00805F9B34FB"
#define CHAR_HR_CONTROL_POINT_UUID  "00002A39-0000-1000-8000-00805F9B34FB"

#define SERVICE_CUSTOM_CTRL_UUID    "0000FFF0-0000-1000-8000-00805F9B34FB"
#define CHAR_MODE_CTRL_UUID         "0000FFF1-0000-1000-8000-00805F9B34FB"

// Global Pointers
BLEServer* pServer = nullptr;
BLECharacteristic* pBatteryChar = nullptr;
BLECharacteristic* pHeartRateChar = nullptr;
BLECharacteristic* pModeChar = nullptr;

bool deviceConnected = false;
bool oldDeviceConnected = false;
uint8_t batteryLevel = 94;
uint8_t currentBpm = 72;
uint8_t workoutMode = 0; // 0=Resting, 1=Cardio, 2=Sprint
unsigned long lastNotifyTime = 0;

// Connection State Callbacks
class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    digitalWrite(LED_PIN, HIGH);
    Serial.println("[GAP] Central connected! Connection anchor locked.");
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    digitalWrite(LED_PIN, LOW);
    Serial.println("[GAP] Central disconnected. Restarting advertising...");
  }
};

// Mode Characteristic Write Callback
class ModeCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    if (value.length() > 0) {
      workoutMode = (uint8_t)value[0];
      Serial.print("[GATT] Received Mode write: ");
      Serial.println(workoutMode);

      if (workoutMode == 0) currentBpm = 72;
      else if (workoutMode == 1) currentBpm = 125;
      else if (workoutMode == 2) currentBpm = 168;
    }
  }
};

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.println("\n==========================================");
  Serial.println("  PulseGlow BLE ESP32 Peripheral Starting");
  Serial.println("==========================================");

  // 1. Initialize BLE Device
  BLEDevice::init("PulseGlow BLE");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // 2. Battery Service (0x180F)
  BLEService *pBatteryService = pServer->createService(SERVICE_BATTERY_UUID);
  pBatteryChar = pBatteryService->createCharacteristic(
    CHAR_BATTERY_LEVEL_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pBatteryChar->addDescriptor(new BLE2902());
  pBatteryChar->setValue(&batteryLevel, 1);
  pBatteryService->start();

  // 3. Heart Rate Service (0x180D)
  BLEService *pHrService = pServer->createService(SERVICE_HEART_RATE_UUID);
  
  // Heart Rate Measurement (0x2A37)
  pHeartRateChar = pHrService->createCharacteristic(
    CHAR_HEART_RATE_MEAS_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pHeartRateChar->addDescriptor(new BLE2902());

  // Body Sensor Location (0x2A38) -> 1 = Chest
  BLECharacteristic *pLocChar = pHrService->createCharacteristic(
    CHAR_BODY_SENSOR_LOC_UUID,
    BLECharacteristic::PROPERTY_READ
  );
  uint8_t sensorLoc = 1; // Chest
  pLocChar->setValue(&sensorLoc, 1);

  // Heart Rate Control Point (0x2A39)
  BLECharacteristic *pCtrlChar = pHrService->createCharacteristic(
    CHAR_HR_CONTROL_POINT_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pHrService->start();

  // 4. Custom Control Service (0xFFF0)
  BLEService *pCustomService = pServer->createService(SERVICE_CUSTOM_CTRL_UUID);
  pModeChar = pCustomService->createCharacteristic(
    CHAR_MODE_CTRL_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE
  );
  pModeChar->setCallbacks(new ModeCallbacks());
  pModeChar->setValue(&workoutMode, 1);
  pCustomService->start();

  // 5. Start Advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_HEART_RATE_UUID);
  pAdvertising->addServiceUUID(SERVICE_BATTERY_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // 7.5ms min interval
  pAdvertising->setMaxPreferred(0x12); // 22.5ms max interval

  BLEDevice::startAdvertising();
  Serial.println("[GAP] Advertising started on Channels 37, 38, 39.");
  Serial.println("[GAP] Open web/index.html in Chrome/Edge and click Scan!");
}

void loop() {
  // If connected, stream Heart Rate notifications every 1000ms
  if (deviceConnected) {
    unsigned long now = millis();
    if (now - lastNotifyTime >= 1000) {
      lastNotifyTime = now;

      // Simulate natural heart rate drift +/- 2 BPM
      int drift = random(-2, 3);
      uint8_t bpm = constrain(currentBpm + drift, 50, 190);
      uint16_t rrInterval = (uint16_t)((60000.0 / bpm) * 1.024);

      // Packet payload: [Flags (0x16), BPM, RR Low, RR High]
      uint8_t hrmPacket[4];
      hrmPacket[0] = 0x16; // Flags: 8-bit BPM, Sensor Contact, RR Present
      hrmPacket[1] = bpm;
      hrmPacket[2] = (uint8_t)(rrInterval & 0xFF);
      hrmPacket[3] = (uint8_t)((rrInterval >> 8) & 0xFF);

      pHeartRateChar->setValue(hrmPacket, 4);
      pHeartRateChar->notify();

      Serial.print("[ATT Notify] Sent Heart Rate: ");
      Serial.print(bpm);
      Serial.print(" BPM (RR: ");
      Serial.print(rrInterval);
      Serial.println(" ms)");
    }
  }

  // Handle Disconnect & Re-advertising Handshake
  if (!deviceConnected && oldDeviceConnected) {
    delay(500); // Give the BLE stack a moment
    pServer->startAdvertising();
    Serial.println("[GAP] Restarted advertising after disconnect.");
    oldDeviceConnected = deviceConnected;
  }

  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  delay(20);
}
