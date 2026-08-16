"""
SAFEPARK 360 - optional Python (Flask) backend.

WHEN DO YOU NEED THIS?
  You do NOT need Python for the dashboard itself: the web app talks to the
  Firebase Realtime Database directly and receives live updates over a
  websocket, which is faster and simpler.

  Use this Flask backend only when you need a *trusted server*:
    - Admin/report APIs that must not expose the Firebase key to the browser
    - Generating reports (daily/monthly CSV) for the project viva
    - Registering / revoking RFID cards with a service account
    - Any logic that must run even when nobody has the dashboard open

RUN
  pip install -r requirements.txt
  python app.py            # http://localhost:5000
"""

from datetime import datetime, timedelta

from flask import Flask, jsonify, request
from flask_cors import CORS

from firebase_config import db_ref

app = Flask(__name__)
CORS(app)  # allows the dashboard (different port) to call these APIs


def _ok(data):
    return jsonify({"success": True, "data": data})


def _err(message, code=500):
    return jsonify({"success": False, "error": message}), code


@app.get("/api/health")
def health():
    """Simple check that the backend and Firebase link are alive."""
    try:
        db_ref("device/esp32").get()
        return _ok({"status": "healthy", "firebase": "connected"})
    except Exception as exc:  # noqa: BLE001
        return _err(f"Firebase unreachable: {exc}", 503)


@app.get("/api/parking-status")
def parking_status():
    """Live status of all 5 slots + summary counters."""
    try:
        slots = db_ref("parkingSlots").get() or {}
        occupied = sum(1 for s in slots.values() if s.get("occupied"))
        reserved = sum(1 for s in slots.values() if s.get("isReserved"))
        return _ok(
            {
                "slots": slots,
                "totalSlots": 5,
                "occupied": occupied,
                "available": 5 - occupied,
                "reserved": reserved,
            }
        )
    except Exception as exc:  # noqa: BLE001
        return _err(str(exc))


@app.get("/api/vehicles")
def vehicles():
    """
    Vehicle records with optional filters:
      /api/vehicles?status=inside&slot=slot3&date=2026-08-16
    """
    try:
        records = db_ref("vehicles/vehicleRecords").get() or {}
        status = request.args.get("status")
        slot = request.args.get("slot")
        date = request.args.get("date")

        result = []
        for key, rec in records.items():
            rec["id"] = key
            if status and rec.get("status") != status:
                continue
            if slot and rec.get("slot") != slot:
                continue
            if date:
                entry = datetime.fromtimestamp(rec.get("entryTime", 0) / 1000)
                if entry.strftime("%Y-%m-%d") != date:
                    continue
            result.append(rec)

        result.sort(key=lambda r: r.get("entryTime", 0), reverse=True)
        return _ok(result)
    except Exception as exc:  # noqa: BLE001
        return _err(str(exc))


@app.get("/api/alerts")
def alerts():
    """All alerts; add ?active=true for unresolved ones only."""
    try:
        raw = db_ref("alerts").get() or {}
        items = [{**v, "id": k} for k, v in raw.items()]
        if request.args.get("active") == "true":
            items = [a for a in items if not a.get("resolved")]
        items.sort(key=lambda a: a.get("timestamp", 0), reverse=True)
        return _ok(items)
    except Exception as exc:  # noqa: BLE001
        return _err(str(exc))


@app.post("/api/alerts/<alert_id>/resolve")
def resolve_alert(alert_id):
    """Acknowledge an alert from the dashboard."""
    try:
        db_ref(f"alerts/{alert_id}").update({"resolved": True})
        return _ok({"id": alert_id, "resolved": True})
    except Exception as exc:  # noqa: BLE001
        return _err(str(exc))


@app.get("/api/sensors")
def sensors():
    """Latest MQ-2 / IR / ultrasonic values plus ESP32 health."""
    try:
        data = db_ref("sensors").get() or {}
        device = db_ref("device/esp32").get() or {}
        last_seen = device.get("lastSeen", 0) / 1000
        device["online"] = (datetime.now().timestamp() - last_seen) < 30
        return _ok({"sensors": data, "device": device})
    except Exception as exc:  # noqa: BLE001
        return _err(str(exc))


@app.get("/api/analytics")
def analytics():
    """Daily entries/exits and average duration for the last 7 days."""
    try:
        records = db_ref("vehicles/vehicleRecords").get() or {}
        days = {
            (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d"): {"entries": 0, "exits": 0}
            for i in range(6, -1, -1)
        }
        durations = []
        for rec in records.values():
            entry = rec.get("entryTime")
            if entry:
                key = datetime.fromtimestamp(entry / 1000).strftime("%Y-%m-%d")
                if key in days:
                    days[key]["entries"] += 1
            exit_time = rec.get("exitTime")
            if exit_time:
                key = datetime.fromtimestamp(exit_time / 1000).strftime("%Y-%m-%d")
                if key in days:
                    days[key]["exits"] += 1
            if rec.get("durationMs"):
                durations.append(rec["durationMs"])

        avg_minutes = round(sum(durations) / len(durations) / 60000, 1) if durations else 0
        return _ok({"daily": days, "averageDurationMinutes": avg_minutes})
    except Exception as exc:  # noqa: BLE001
        return _err(str(exc))


@app.post("/api/rfid/authorise")
def authorise_card():
    """Register an RFID card -> vehicle number (admin action)."""
    body = request.get_json(silent=True) or {}
    uid, plate = body.get("rfid"), body.get("vehicleNumber")
    if not uid or not plate:
        return _err("rfid and vehicleNumber are required", 400)
    try:
        db_ref("rfid/authorisedCards").update({uid.replace(" ", "_"): plate})
        return _ok({"rfid": uid, "vehicleNumber": plate})
    except Exception as exc:  # noqa: BLE001
        return _err(str(exc))


@app.errorhandler(404)
def not_found(_):
    return _err("Endpoint not found", 404)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
