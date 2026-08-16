/*
  ==========================================================================
  SAFEPARK 360 - Intelligent Smart Parking System
  ESP32 firmware: sensors -> Firebase Realtime Database -> Web dashboard
  --------------------------------------------------------------------------
  HARDWARE
    5 x HC-SR04 ultrasonic (one per parking slot)
    1 x MFRC522 RFID reader + RFID cards
    1 x IR sensor (gate vehicle confirmation)
    1 x MQ-2 smoke/gas sensor (analog)
    2 x SG90 servo (entry gate + exit gate)
    1 x 16x2 I2C LCD
    1 x Buzzer, Green LED, Red LED
    Time source: ESP32 NTP (DS3231 optional)

  ARDUINO LIBRARIES TO INSTALL (Library Manager)
    Firebase ESP Client (mobizt)   - Firebase_ESP_Client.h
    MFRC522 (miguelbalboa)
    ESP32Servo
    LiquidCrystal_I2C
    (optional) RTClib for DS3231
  ==========================================================================
*/

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <time.h>

// ----------------------- 1. CONFIGURATION --------------------------------
#define WIFI_SSID       "YOUR_WIFI_NAME"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

#define API_KEY         "YOUR_FIREBASE_WEB_API_KEY"          // Project settings -> Web API key
#define DATABASE_URL    "https://YOUR_PROJECT-default-rtdb.firebaseio.com"
#define USER_EMAIL      "device@safepark360.com"             // Auth -> Email/Password user
#define USER_PASSWORD   "YOUR_DEVICE_PASSWORD"

#define ROOT            "SAFEPARK360"

// ----------------------- 2. PIN MAP --------------------------------------
const int TRIG_PINS[5] = {13, 14, 27, 26, 25};
const int ECHO_PINS[5] = {12, 5, 33, 32, 35};
#define IR_PIN        4
#define MQ2_PIN       34      // analog input
#define BUZZER_PIN    2
#define LED_GREEN     15
#define LED_RED       0
#define RFID_SS       21
#define RFID_RST      22
#define SERVO_ENTRY   18
#define SERVO_EXIT    19

const int OCCUPIED_CM   = 25;   // < 25 cm  => a car is in the slot
const int SMOKE_LIMIT   = 600;  // MQ-2 ppm-equivalent threshold
const int RESERVED_SLOT = 5;    // slot5 is the reserved slot

// ----------------------- 3. GLOBALS --------------------------------------
FirebaseData  fbdo;
FirebaseAuth  auth;
FirebaseConfig config;

MFRC522 rfid(RFID_SS, RFID_RST);
Servo entryGate, exitGate;
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Authorised RFID cards -> vehicle numbers (also mirrored in Firebase).
struct Card { const char* uid; const char* plate; };
Card authorisedCards[] = {
  {"A1 B2 C3 D4", "MH01AB1234"},
  {"E5 F6 07 18", "MH02CD5678"},
  {"9A 3B 7C 2D", "MH03EF9012"}
};
const int CARD_COUNT = sizeof(authorisedCards) / sizeof(Card);

bool   slotOccupied[5] = {false, false, false, false, false};
String slotVehicle[5]  = {"", "", "", "", ""};
unsigned long lastPush = 0;

// ----------------------- 4. HELPERS --------------------------------------

// Epoch milliseconds from NTP (the dashboard shows this as entry/exit time).
uint64_t nowMs() {
  time_t now; time(&now);
  return (uint64_t)now * 1000ULL;
}

// Read one HC-SR04 and return the distance in centimetres.
long readDistance(int i) {
  digitalWrite(TRIG_PINS[i], LOW);  delayMicroseconds(2);
  digitalWrite(TRIG_PINS[i], HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PINS[i], LOW);
  long dur = pulseIn(ECHO_PINS[i], HIGH, 30000);   // 30 ms timeout
  if (dur == 0) return 400;                        // no echo -> treat as empty
  return dur * 0.034 / 2;
}

// Read the RFID UID as "A1 B2 C3 D4".
String readCardUid() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
    if (i < rfid.uid.size - 1) uid += " ";
  }
  uid.toUpperCase();
  return uid;
}

int findCard(String uid) {
  for (int i = 0; i < CARD_COUNT; i++)
    if (uid.equalsIgnoreCase(authorisedCards[i].uid)) return i;
  return -1;
}

void openGate(Servo &s) { s.write(90); delay(3000); s.write(0); }

void lcdShow(String l1, String l2) {
  lcd.clear(); lcd.setCursor(0, 0); lcd.print(l1);
  lcd.setCursor(0, 1); lcd.print(l2);
}

// Write one parking slot node: SAFEPARK360/parkingSlots/slotN
void pushSlot(int i, long distance) {
  String path = String(ROOT) + "/parkingSlots/slot" + String(i + 1);
  FirebaseJson j;
  j.set("occupied",      slotOccupied[i]);
  j.set("isReserved",    (i + 1) == RESERVED_SLOT);
  j.set("vehicleNumber", slotVehicle[i]);
  j.set("distanceCm",    (int)distance);
  j.set("sensor",        distance >= 400 ? "fault" : "ok");
  Firebase.RTDB.updateNode(&fbdo, path.c_str(), &j);
}

// Create a vehicle record on entry -> SAFEPARK360/vehicles/vehicleRecords/<id>
void pushEntry(String plate, String uid, int slot) {
  FirebaseJson j;
  j.set("vehicleNumber", plate);
  j.set("rfid",   uid);
  j.set("slot",   "slot" + String(slot + 1));
  j.set("entryTime", (double)nowMs());
  j.set("exitTime",  0);
  j.set("durationMs", 0);
  j.set("status", "inside");
  j.set("authorised", true);
  Firebase.RTDB.pushJSON(&fbdo, String(ROOT) + "/vehicles/vehicleRecords", &j);
  Firebase.RTDB.pushJSON(&fbdo, String(ROOT) + "/entries", &j);
}

// Close the record on exit and store the parking duration.
void pushExit(String plate, int slot, uint64_t entryTime) {
  uint64_t out = nowMs();
  FirebaseJson j;
  j.set("vehicleNumber", plate);
  j.set("slot", "slot" + String(slot + 1));
  j.set("exitTime",  (double)out);
  j.set("durationMs", (double)(out - entryTime));
  j.set("status", "exited");
  Firebase.RTDB.pushJSON(&fbdo, String(ROOT) + "/exits", &j);
}

// Any alert (wrong parking, unauthorised card, smoke) -> SAFEPARK360/alerts
void pushAlert(String type, String severity, String title, String msg,
               String slot, String plate) {
  FirebaseJson j;
  j.set("type", type);
  j.set("severity", severity);
  j.set("title", title);
  j.set("message", msg);
  j.set("slot", slot);
  j.set("vehicleNumber", plate);
  j.set("timestamp", (double)nowMs());
  j.set("resolved", false);
  Firebase.RTDB.pushJSON(&fbdo, String(ROOT) + "/alerts", &j);
}

// ----------------------- 5. SETUP ----------------------------------------
void setup() {
  Serial.begin(115200);

  for (int i = 0; i < 5; i++) { pinMode(TRIG_PINS[i], OUTPUT); pinMode(ECHO_PINS[i], INPUT); }
  pinMode(IR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);

  Wire.begin();
  lcd.init(); lcd.backlight();
  lcdShow("SAFEPARK 360", "Booting...");

  SPI.begin(); rfid.PCD_Init();
  entryGate.attach(SERVO_ENTRY); entryGate.write(0);
  exitGate.attach(SERVO_EXIT);   exitGate.write(0);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(400); Serial.print("."); }
  Serial.println("\nWiFi connected: " + WiFi.localIP().toString());

  // NTP time (IST = GMT+5:30 -> 19800 seconds)
  configTime(19800, 0, "pool.ntp.org", "time.nist.gov");

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  lcdShow("SAFEPARK 360", "System Ready");
}

// ----------------------- 6. MAIN LOOP ------------------------------------
void loop() {
  // ---------- 6a. RFID entry / exit ----------
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String uid = readCardUid();
    int idx = findCard(uid);

    if (idx >= 0) {
      String plate = authorisedCards[idx].plate;
      int parkedIn = -1;
      for (int i = 0; i < 5; i++) if (slotVehicle[i] == plate) parkedIn = i;

      if (parkedIn == -1) {                       // ENTRY
        int free = -1;
        for (int i = 0; i < 5; i++)
          if (!slotOccupied[i] && (i + 1) != RESERVED_SLOT) { free = i; break; }

        if (free >= 0) {
          slotVehicle[free] = plate;
          lcdShow("Authorised", plate);
          digitalWrite(LED_GREEN, HIGH);
          Firebase.RTDB.setString(&fbdo, String(ROOT) + "/device/gate", "open");
          openGate(entryGate);
          Firebase.RTDB.setString(&fbdo, String(ROOT) + "/device/gate", "closed");
          digitalWrite(LED_GREEN, LOW);
          pushEntry(plate, uid, free);
        } else {
          lcdShow("Parking Full", "Try again later");
        }
      } else {                                    // EXIT
        lcdShow("Exit Granted", plate);
        openGate(exitGate);
        pushExit(plate, parkedIn, nowMs());       // replace with stored entry time
        slotVehicle[parkedIn] = "";
      }
    } else {                                      // UNAUTHORISED CARD
      lcdShow("Unauthorised", "Access Denied");
      digitalWrite(LED_RED, HIGH); tone(BUZZER_PIN, 2000, 600);
      pushAlert("unauthorised_rfid", "warning", "Unauthorised RFID card",
                "Card " + uid + " is not registered.", "", "");
      delay(1200); digitalWrite(LED_RED, LOW);
    }
    rfid.PICC_HaltA(); rfid.PCD_StopCrypto1();
  }

  // ---------- 6b. Slot occupancy + wrong parking ----------
  if (millis() - lastPush > 2000) {              // push every 2 seconds
    lastPush = millis();
    int freeCount = 0;

    for (int i = 0; i < 5; i++) {
      long d = readDistance(i);
      bool nowOcc = d < OCCUPIED_CM;

      // Reserved slot occupied by a car that never scanned a valid card.
      if ((i + 1) == RESERVED_SLOT && nowOcc && !slotOccupied[i] && slotVehicle[i] == "") {
        digitalWrite(LED_RED, HIGH); tone(BUZZER_PIN, 2500, 1500);
        pushAlert("wrong_parking", "critical", "Reserved Slot Occupied",
                  "Unauthorised vehicle detected in the reserved slot.",
                  "slot" + String(i + 1), "");
        lcdShow("WRONG PARKING", "Reserved Slot");
      }
      if ((i + 1) == RESERVED_SLOT && !nowOcc) digitalWrite(LED_RED, LOW);

      slotOccupied[i] = nowOcc;
      if (!nowOcc) { slotVehicle[i] = ""; freeCount++; }
      pushSlot(i, d);
    }

    // ---------- 6c. MQ-2 smoke + IR ----------
    int ppm = analogRead(MQ2_PIN) / 4;           // 0-4095 -> approx ppm scale
    bool smoke = ppm > SMOKE_LIMIT;
    FirebaseJson sj;
    sj.set("mq2/ppm", ppm);
    sj.set("mq2/alert", smoke);
    sj.set("ir/triggered", digitalRead(IR_PIN) == LOW);
    sj.set("ir/status", "ok");
    Firebase.RTDB.updateNode(&fbdo, String(ROOT) + "/sensors", &sj);

    if (smoke) {
      tone(BUZZER_PIN, 3000, 1000);
      lcdShow("!! SMOKE ALERT", String(ppm) + " ppm");
      pushAlert("smoke", "critical", "Smoke / gas detected",
                "MQ-2 reading " + String(ppm) + " ppm above threshold.", "", "");
      openGate(exitGate);                        // release exit gate for safety
    }

    // ---------- 6d. Device heartbeat ----------
    FirebaseJson dj;
    dj.set("online", true);
    dj.set("lastSeen", (double)nowMs());
    dj.set("ssid", String(WIFI_SSID));
    dj.set("rssi", WiFi.RSSI());
    dj.set("firebaseConnected", Firebase.ready());
    dj.set("firmware", "v1.4.2");
    dj.set("uptimeSec", (int)(millis() / 1000));
    Firebase.RTDB.updateNode(&fbdo, String(ROOT) + "/device/esp32", &dj);

    if (!smoke) lcdShow("SAFEPARK 360", "Free slots: " + String(freeCount));
  }
}
