// Reference snippets shown on the Setup & Hardware page.

export const DB_STRUCTURE = `SAFEPARK360
├── parkingSlots
│   ├── slot1 { occupied: false, isReserved: false, vehicleNumber: "",
│   │           entryTime: 0, distanceCm: 132, sensor: "ok" }
│   ├── slot2 ... slot4  (same fields)
│   └── slot5 { occupied: false, isReserved: true,  ... }   <- reserved slot
│
├── vehicles
│   └── vehicleRecords
│       └── <pushId> { vehicleNumber: "MH01AB1234", rfid: "A1 B2 C3 D4",
│                      slot: "slot3", entryTime: 1755331200000,
│                      exitTime: 0, durationMs: 0,
│                      status: "inside" | "exited", authorised: true }
│
├── rfid
│   └── authorisedCards { "A1_B2_C3_D4": "MH01AB1234", ... }
│
├── entries   -> <pushId> { vehicleNumber, rfid, slot, entryTime }
├── exits     -> <pushId> { vehicleNumber, slot, exitTime, durationMs }
│
├── alerts
│   └── <pushId> { type: "wrong_parking" | "unauthorised_rfid" | "smoke",
│                  severity: "critical" | "warning" | "info",
│                  title, message, slot, vehicleNumber,
│                  timestamp, resolved: false }
│
├── sensors
│   ├── ultrasonic { slot1: 132, ... slot5: 18 }
│   ├── ir  { triggered: false, status: "ok" }
│   └── mq2 { ppm: 180, alert: false }
│
└── device
    ├── gate: "closed"
    ├── buzzer: false
    └── esp32 { online: true, lastSeen: 1755331200000, ssid: "SAFEPARK_NET",
                rssi: -58, firebaseConnected: true, firmware: "v1.4.2",
                uptimeSec: 8123 }`;

export const RULES = `{
  "rules": {
    "SAFEPARK360": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}`;

export const ESP32_SNIPPET = `// Publish one parking slot to Firebase (full sketch: esp32/safepark360.ino)
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

// Wrong-parking detection on the reserved slot (slot5)
if ((i + 1) == RESERVED_SLOT && nowOcc && slotVehicle[i] == "") {
  digitalWrite(LED_RED, HIGH);
  tone(BUZZER_PIN, 2500, 1500);
  pushAlert("wrong_parking", "critical", "Reserved Slot Occupied",
            "Unauthorised vehicle detected in the reserved slot.",
            "slot5", "");
}`;

export const FLASK_SNIPPET = `# backend/app.py  (run:  pip install -r requirements.txt && python app.py)
@app.get("/api/parking-status")
def parking_status():
    slots = db_ref("parkingSlots").get() or {}
    occupied = sum(1 for s in slots.values() if s.get("occupied"))
    return _ok({"slots": slots, "occupied": occupied,
                "available": 5 - occupied, "totalSlots": 5})`;

export const HARDWARE = [
  ["5 × HC-SR04 ultrasonic", "TRIG 13/14/27/26/25 · ECHO 12/5/33/32/35", "Slot occupancy (< 25 cm = occupied)"],
  ["MFRC522 RFID reader", "SS 21 · RST 22 · SPI 18/19/23", "Entry & exit authorisation"],
  ["IR sensor", "GPIO 4", "Confirms a vehicle is at the gate"],
  ["MQ-2 smoke sensor", "GPIO 34 (analog)", "Fire / gas safety, threshold 600 ppm"],
  ["2 × SG90 servo", "GPIO 18 (entry) · 19 (exit)", "Gate barrier control"],
  ["16×2 I2C LCD", "SDA 21 · SCL 22 (addr 0x27)", "On-site status display"],
  ["Buzzer + LEDs", "Buzzer 2 · Green 15 · Red 0", "Audible/visual alarms"],
  ["DS3231 RTC / NTP", "I2C or Wi-Fi NTP (GMT+5:30)", "Accurate entry & exit timestamps"],
] as const;
