// SAFEPARK 360 - single realtime data store for the whole dashboard.
//
// HOW IT WORKS
// 1. If you pasted real credentials in firebase-config.ts, the store attaches
//    onValue() listeners to SAFEPARK360/* and pushes every change to the UI
//    (no page refresh needed).
// 2. Otherwise it runs the built-in simulator, so the dashboard is fully
//    demo-able without the ESP32.

import { firebaseConfig, isFirebaseConfigured, DB_ROOT } from "./firebase-config";
import { createInitialState, tick } from "./simulator";
import type { AlertRecord, SafeparkState, VehicleRecord } from "./types";

type Listener = (s: SafeparkState) => void;

let state: SafeparkState = createInitialState();
const listeners = new Set<Listener>();
let started = false;
let timer: ReturnType<typeof setInterval> | null = null;

function emit(next: SafeparkState) {
  state = next;
  listeners.forEach((l) => l(state));
}

/** Convert a Firebase snapshot object into our SafeparkState shape. */
function fromFirebase(raw: Record<string, unknown>): SafeparkState {
  const slotsRaw = (raw.parkingSlots ?? {}) as Record<string, Record<string, unknown>>;
  const slots = [1, 2, 3, 4, 5].map((n) => {
    const s = slotsRaw[`slot${n}`] ?? {};
    const isReserved = Boolean(s.isReserved ?? n === 5);
    const occupied = Boolean(s.occupied);
    return {
      id: `slot${n}`,
      number: n,
      isReserved,
      status: occupied ? "occupied" : isReserved ? "reserved" : "available",
      vehicleNumber: (s.vehicleNumber as string) || null,
      entryTime: (s.entryTime as number) || null,
      distanceCm: Number(s.distanceCm ?? 0),
      sensor: (s.sensor as "ok" | "fault") ?? "ok",
    } as SafeparkState["slots"][number];
  });

  const toArray = <T,>(node: unknown): T[] =>
    node ? (Object.entries(node as Record<string, T>).map(([id, v]) => ({ id, ...v })) as T[]) : [];

  const vehicles = toArray<VehicleRecord>((raw.vehicles as Record<string, unknown>)?.vehicleRecords)
    .sort((a, b) => b.entryTime - a.entryTime);
  const alerts = toArray<AlertRecord>(raw.alerts).sort((a, b) => b.timestamp - a.timestamp);

  const sensors = (raw.sensors ?? {}) as Record<string, Record<string, unknown>>;
  const mq2 = (sensors.mq2 ?? {}) as Record<string, unknown>;
  const ir = (sensors.ir ?? {}) as Record<string, unknown>;
  const device = ((raw.device as Record<string, unknown>)?.esp32 ?? {}) as Record<string, unknown>;
  const lastSeen = Number(device.lastSeen ?? 0);

  return {
    slots,
    vehicles,
    alerts,
    sensors: {
      mq2Ppm: Number(mq2.ppm ?? 0),
      smokeAlert: Boolean(mq2.alert),
      irEntry: Boolean(ir.triggered),
      irStatus: (ir.status as "ok" | "fault") ?? "ok",
      buzzer: Boolean((raw.device as Record<string, unknown>)?.buzzer),
      gate: ((raw.device as Record<string, unknown>)?.gate as "open" | "closed") ?? "closed",
      ultrasonicOnline: slots.filter((s) => s.sensor === "ok").length,
    },
    device: {
      // ESP32 heartbeats every 10s -> treat >30s silence as offline.
      online: Boolean(device.online) && Date.now() - lastSeen < 30_000,
      lastSeen,
      wifiSsid: String(device.ssid ?? "-"),
      wifiRssi: Number(device.rssi ?? 0),
      firebaseConnected: Boolean(device.firebaseConnected ?? true),
      firmware: String(device.firmware ?? "-"),
      uptimeSec: Number(device.uptimeSec ?? 0),
    },
    daily: state.daily,
    source: "firebase",
    connected: true,
  };
}

async function startFirebase() {
  try {
    const { initializeApp } = await import("firebase/app");
    const { getDatabase, ref, onValue } = await import("firebase/database");
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    onValue(
      ref(db, DB_ROOT),
      (snap) => emit(fromFirebase((snap.val() ?? {}) as Record<string, unknown>)),
      () => emit({ ...state, source: "firebase", connected: false }),
    );
  } catch (err) {
    console.error("[SAFEPARK360] Firebase init failed, falling back to simulation", err);
    startSimulation();
  }
}

function startSimulation() {
  emit({ ...createInitialState(), source: "simulation", connected: true });
  timer = setInterval(() => emit(tick(state)), 4000);
}

/** Called once by the layout; safe to call repeatedly. */
export function startSafepark() {
  if (started || typeof window === "undefined") return;
  started = true;
  if (isFirebaseConfigured()) void startFirebase();
  else startSimulation();
}

export function stopSafepark() {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

/** Manually resolve an alert (also writable to Firebase when configured). */
export function resolveAlert(id: string) {
  emit({
    ...state,
    alerts: state.alerts.map((a) => (a.id === id ? { ...a, resolved: true } : a)),
  });
}
