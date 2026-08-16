# SAFEPARK 360 — Intelligent Smart Parking System

**Smart Parking. Safer Mobility. Real-Time Control.**

An IoT smart-parking project: an **ESP32** reads 5 parking slots, RFID access, an IR gate sensor and an
MQ-2 smoke sensor, writes everything to a **Firebase Realtime Database**, and this **web dashboard**
displays it live (no refresh needed).

## 1. System architecture

```
Sensors (5x HC-SR04, MFRC522 RFID, IR, MQ-2)
        |
      ESP32  --- servo gates, buzzer, LEDs, 16x2 I2C LCD, NTP/DS3231 time
        |  (Wi-Fi, writes every 2 s + on every event)
Firebase Realtime Database  (SAFEPARK360/...)
        |  (websocket push, onValue listeners)
Web dashboard (HTML5 / CSS3 / JavaScript)      Optional Flask backend (admin APIs, reports)
```

## 2. Dashboard features

- Overview with 8 live summary cards (total / available / occupied / reserved slots, vehicles inside,
  today's entries and exits, active alerts)
- 5 visual slot cards — 🟢 available, 🔴 occupied, 🟡 reserved (slot 5) — with vehicle number, entry
  time, live parked duration and ultrasonic sensor reading
- RFID entry/exit monitoring with authorised/unauthorised status and parking-duration calculation
- Wrong-parking / reserved-slot alert banner + full alert history with acknowledge
- Safety monitoring: MQ-2 smoke, IR gate sensor, buzzer, ultrasonic array, ESP32 connectivity
- Vehicle records with search, slot/status/date filters, sorting, pagination and CSV export
- Analytics: daily entries vs exits, slot usage, occupancy pie, weekly activity, average duration
- Firebase connection status and ESP32 device status (online/offline, last seen, Wi-Fi, firmware)
- Fully responsive sidebar layout for desktop and mobile

## 3. Firebase database structure

See the **Setup & Hardware** page in the app for the complete field-by-field tree
(`SAFEPARK360/parkingSlots`, `vehicles/vehicleRecords`, `rfid/authorisedCards`, `entries`, `exits`,
`alerts`, `sensors/{ultrasonic,ir,mq2}`, `device/esp32`).

## 4. Folder structure

```
SAFEPARK360/
├── src/                       # dashboard frontend
│   ├── routes/                # /, /vehicles, /alerts, /safety, /analytics, /setup
│   ├── components/safepark/   # layout, slot cards, stat cards, badges
│   ├── lib/safepark/          # firebase-config.ts, store.ts, simulator.ts, types.ts, docs.ts
│   └── styles.css             # design system
├── backend/                   # optional Python API (Flask)
│   ├── app.py
│   ├── firebase_config.py
│   └── requirements.txt
├── esp32/
│   └── safepark360.ino        # complete ESP32 firmware
└── README.md
```

## 5. Firebase configuration (where to paste your keys)

Open **`src/lib/safepark/firebase-config.ts`** and replace every `YOUR_...` placeholder with the values
from Firebase console → Project settings → Web app. Until then the dashboard runs in **simulation mode**
so you can demo it without hardware.

Realtime Database rules for the project:

```json
{ "rules": { "SAFEPARK360": { ".read": true, ".write": "auth != null" } } }
```

## 6. ESP32 setup

1. Arduino IDE → Boards Manager → install **esp32** by Espressif.
2. Library Manager → install **Firebase ESP Client (mobizt)**, **MFRC522**, **ESP32Servo**,
   **LiquidCrystal_I2C** (and **RTClib** if you use a DS3231).
3. Open `esp32/safepark360.ino`, fill in Wi-Fi SSID/password, `API_KEY`, `DATABASE_URL`,
   `USER_EMAIL`, `USER_PASSWORD`.
4. Wire the components using the pin map documented at the top of the sketch (also shown on the
   Setup page).
5. Upload at 115200 baud and watch the Serial Monitor for `WiFi connected` + token ready.

## 7. Python backend (only if you need it)

Not required for the dashboard — the browser talks to Firebase directly. Use it for admin/report APIs:

```bash
cd backend
pip install -r requirements.txt
# place serviceAccountKey.json here (Firebase → Service accounts → Generate new private key)
python app.py       # http://localhost:5000/api/health
```

Endpoints: `/api/parking-status`, `/api/vehicles`, `/api/alerts`, `/api/alerts/<id>/resolve`,
`/api/sensors`, `/api/analytics`, `/api/rfid/authorise`.

## 8. Run the dashboard

```bash
npm install
npm run dev
```

## 9. Testing without hardware

Keep the placeholder Firebase config: the simulator produces entries, exits, reserved-slot violations and
MQ-2 spikes every 4 seconds so every screen, chart and alert can be demonstrated.

## 10. Troubleshooting

| Symptom | Fix |
| --- | --- |
| ESP32 shows Offline | Wi-Fi credentials, or heartbeat older than 30 s |
| Tables empty | wrong `databaseURL`, or rules block read |
| Slot always occupied | recalibrate `OCCUPIED_CM` in the sketch |
| Wrong timestamps | NTP offset must be `19800` for IST |
| RFID never reads | check 3.3 V supply and SPI wiring (SS 21, RST 22) |

## 11. Demo tips

Show the live simulation first, then power the ESP32 and place a card on the reader so the same UI
switches to real data; trigger the reserved slot with an unregistered car to demo the red alert, and open
the dashboard on a phone to prove the responsive design.
