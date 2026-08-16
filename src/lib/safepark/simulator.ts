// SAFEPARK 360 - simulation engine.
// Used when no Firebase credentials are configured, so the dashboard can be
// demoed without the ESP32 hardware. It produces the SAME shape of data that
// the ESP32 writes to Firebase, so nothing else in the UI has to change.

import type {
  AlertRecord,
  DailyStat,
  ParkingSlot,
  SafeparkState,
  VehicleRecord,
} from "./types";

const PLATES = [
  "MH01AB1234",
  "MH02CD5678",
  "MH03EF9012",
  "MH04GH3456",
  "MH12JK7788",
  "MH14LM2211",
  "MH31NP4567",
  "MH20QR8899",
];
const RFIDS = [
  "A1 B2 C3 D4",
  "E5 F6 07 18",
  "9A 3B 7C 2D",
  "44 21 F0 9C",
  "7E 11 20 6B",
  "C3 D9 84 12",
  "5F 6A 3E 90",
  "22 8D 41 AB",
];

const rnd = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(arr: T[]) => arr[rnd(arr.length)] as T;
const HOUR = 3600_000;

let counter = 0;
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${counter++}`;

function makeSlots(): ParkingSlot[] {
  return [1, 2, 3, 4, 5].map((n) => ({
    id: `slot${n}`,
    number: n,
    isReserved: n === 5,
    status: n === 5 ? "reserved" : "available",
    vehicleNumber: null,
    entryTime: null,
    distanceCm: 120 + rnd(40),
    sensor: "ok",
  }));
}

function seedDaily(): DailyStat[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day) => ({
    day,
    entries: 12 + rnd(22),
    exits: 10 + rnd(20),
  }));
}

export function createInitialState(): SafeparkState {
  const now = Date.now();
  const slots = makeSlots();
  const vehicles: VehicleRecord[] = [];
  const alerts: AlertRecord[] = [];

  // A few historical (already exited) records so tables/analytics are not empty.
  for (let i = 0; i < 14; i++) {
    const entry = now - (i + 1) * HOUR - rnd(HOUR);
    const dur = 20 * 60_000 + rnd(3 * HOUR);
    vehicles.push({
      id: uid("veh"),
      vehicleNumber: pick(PLATES),
      rfid: pick(RFIDS),
      slot: `slot${1 + rnd(4)}`,
      entryTime: entry,
      exitTime: entry + dur,
      durationMs: dur,
      status: "exited",
      authorised: true,
    });
  }

  // Two vehicles currently parked.
  [1, 3].forEach((n) => {
    const slot = slots[n - 1]!;
    const entry = now - (15 + rnd(90)) * 60_000;
    const plate = pick(PLATES);
    slot.status = "occupied";
    slot.vehicleNumber = plate;
    slot.entryTime = entry;
    slot.distanceCm = 12 + rnd(8);
    vehicles.unshift({
      id: uid("veh"),
      vehicleNumber: plate,
      rfid: pick(RFIDS),
      slot: slot.id,
      entryTime: entry,
      exitTime: null,
      durationMs: null,
      status: "inside",
      authorised: true,
    });
  });

  alerts.push({
    id: uid("alert"),
    type: "unauthorised_rfid",
    severity: "warning",
    title: "Unauthorised RFID card",
    message: "Unknown card 9F 12 4C 08 presented at entry gate. Gate kept closed.",
    slot: null,
    vehicleNumber: null,
    timestamp: now - 4 * HOUR,
    resolved: true,
  });

  return {
    slots,
    vehicles,
    alerts,
    sensors: {
      mq2Ppm: 120 + rnd(60),
      smokeAlert: false,
      irEntry: false,
      irStatus: "ok",
      buzzer: false,
      gate: "closed",
      ultrasonicOnline: 5,
    },
    device: {
      online: true,
      lastSeen: now,
      wifiSsid: "SAFEPARK_NET",
      wifiRssi: -52 - rnd(15),
      firebaseConnected: true,
      firmware: "v1.4.2",
      uptimeSec: 6 * 3600 + rnd(3600),
    },
    daily: seedDaily(),
    source: "simulation",
    connected: true,
  };
}

/** Advance the simulation by one tick (called every ~4s). */
export function tick(prev: SafeparkState): SafeparkState {
  const now = Date.now();
  const slots = prev.slots.map((s) => ({ ...s }));
  let vehicles = prev.vehicles.map((v) => ({ ...v }));
  let alerts = prev.alerts.map((a) => ({ ...a }));
  const daily = prev.daily.map((d) => ({ ...d }));
  const sensors = { ...prev.sensors };
  const device = { ...prev.device, lastSeen: now, uptimeSec: prev.device.uptimeSec + 4 };

  // Small ultrasonic jitter (realistic sensor noise).
  slots.forEach((s) => {
    s.distanceCm =
      s.status === "available"
        ? Math.max(60, Math.min(180, s.distanceCm + rnd(9) - 4))
        : Math.max(6, Math.min(25, s.distanceCm + rnd(5) - 2));
  });

  // MQ-2 drift.
  sensors.mq2Ppm = Math.max(60, Math.min(950, sensors.mq2Ppm + rnd(41) - 20));
  sensors.smokeAlert = sensors.mq2Ppm > 600;
  sensors.buzzer = sensors.smokeAlert;

  if (sensors.smokeAlert && !alerts.some((a) => a.type === "smoke" && !a.resolved)) {
    alerts = [
      {
        id: uid("alert"),
        type: "smoke",
        severity: "critical",
        title: "Smoke / gas detected",
        message: `MQ-2 reading ${sensors.mq2Ppm} ppm exceeds the 600 ppm safety threshold. Buzzer activated.`,
        slot: null,
        vehicleNumber: null,
        timestamp: now,
        resolved: false,
      },
      ...alerts,
    ];
  }
  if (!sensors.smokeAlert) {
    alerts = alerts.map((a) => (a.type === "smoke" ? { ...a, resolved: true } : a));
  }

  const roll = Math.random();

  // --- ENTRY EVENT -------------------------------------------------
  if (roll < 0.3) {
    const free = slots.filter((s) => s.status === "available" && !s.isReserved);
    const authorised = Math.random() > 0.12;
    const plate = pick(PLATES);
    const rfid = authorised ? pick(RFIDS) : "9F 12 4C 08";

    if (!authorised) {
      sensors.gate = "closed";
      alerts = [
        {
          id: uid("alert"),
          type: "unauthorised_rfid",
          severity: "warning",
          title: "Unauthorised RFID card",
          message: `Card ${rfid} is not in authorisedCards. Entry denied, gate stayed closed.`,
          slot: null,
          vehicleNumber: null,
          timestamp: now,
          resolved: false,
        },
        ...alerts,
      ];
    } else if (free.length) {
      const slot = pick(free)!;
      slot.status = "occupied";
      slot.vehicleNumber = plate;
      slot.entryTime = now;
      slot.distanceCm = 10 + rnd(8);
      sensors.gate = "open";
      sensors.irEntry = true;
      vehicles = [
        {
          id: uid("veh"),
          vehicleNumber: plate,
          rfid,
          slot: slot.id,
          entryTime: now,
          exitTime: null,
          durationMs: null,
          status: "inside",
          authorised: true,
        },
        ...vehicles,
      ];
      daily[daily.length - 1]!.entries += 1;
    }
  }

  // --- EXIT EVENT --------------------------------------------------
  else if (roll < 0.5) {
    const inside = vehicles.filter((v) => v.status === "inside");
    if (inside.length) {
      const v = pick(inside)!;
      v.status = "exited";
      v.exitTime = now;
      v.durationMs = now - v.entryTime;
      const slot = slots.find((s) => s.id === v.slot);
      if (slot) {
        slot.status = slot.isReserved ? "reserved" : "available";
        slot.vehicleNumber = null;
        slot.entryTime = null;
        slot.distanceCm = 110 + rnd(40);
      }
      sensors.gate = "open";
      daily[daily.length - 1]!.exits += 1;
      alerts = alerts.map((a) =>
        a.type === "wrong_parking" && a.slot === v.slot ? { ...a, resolved: true } : a,
      );
    }
  }

  // --- WRONG PARKING (reserved slot occupied) ----------------------
  else if (roll < 0.56) {
    const reserved = slots.find((s) => s.isReserved)!;
    if (reserved.status !== "occupied") {
      const plate = pick(PLATES);
      reserved.status = "occupied";
      reserved.vehicleNumber = plate;
      reserved.entryTime = now;
      reserved.distanceCm = 11 + rnd(6);
      sensors.buzzer = true;
      alerts = [
        {
          id: uid("alert"),
          type: "wrong_parking",
          severity: "critical",
          title: "Reserved Slot Occupied",
          message: `Unauthorised vehicle detected in reserved ${reserved.id.toUpperCase()}. Buzzer and red LED activated.`,
          slot: reserved.id,
          vehicleNumber: plate,
          timestamp: now,
          resolved: false,
        },
        ...alerts,
      ];
    }
  } else {
    sensors.gate = "closed";
    sensors.irEntry = false;
  }

  return {
    ...prev,
    slots,
    vehicles: vehicles.slice(0, 200),
    alerts: alerts.slice(0, 60),
    sensors,
    device,
    daily,
  };
}
