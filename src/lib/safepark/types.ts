// SAFEPARK 360 - shared data model.
// These types mirror EXACTLY the Firebase Realtime Database structure
// documented in /setup (SAFEPARK360/...). The ESP32 writes these nodes,
// the dashboard reads them.

export type SlotStatus = "available" | "occupied" | "reserved";
export type SensorHealth = "ok" | "fault";

export interface ParkingSlot {
  /** slot1 ... slot5 */
  id: string;
  number: number;
  /** slot5 is the reserved slot in this project */
  isReserved: boolean;
  status: SlotStatus;
  vehicleNumber: string | null;
  entryTime: number | null; // epoch ms
  distanceCm: number; // ultrasonic reading
  sensor: SensorHealth;
}

export type VehicleStatus = "inside" | "exited";

export interface VehicleRecord {
  id: string;
  vehicleNumber: string;
  rfid: string;
  slot: string; // "slot3"
  entryTime: number;
  exitTime: number | null;
  durationMs: number | null;
  status: VehicleStatus;
  authorised: boolean;
}

export type AlertType =
  | "wrong_parking"
  | "unauthorised_rfid"
  | "smoke"
  | "device_offline";
export type AlertSeverity = "critical" | "warning" | "info";

export interface AlertRecord {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  slot: string | null;
  vehicleNumber: string | null;
  timestamp: number;
  resolved: boolean;
}

export interface SensorState {
  mq2Ppm: number;
  smokeAlert: boolean;
  irEntry: boolean; // IR beam broken at gate
  irStatus: SensorHealth;
  buzzer: boolean;
  gate: "open" | "closed";
  ultrasonicOnline: number; // how many of the 5 are responding
}

export interface DeviceState {
  online: boolean;
  lastSeen: number;
  wifiSsid: string;
  wifiRssi: number;
  firebaseConnected: boolean;
  firmware: string;
  uptimeSec: number;
}

export interface DailyStat {
  day: string; // "Mon" / "12 Aug"
  entries: number;
  exits: number;
}

export interface SafeparkState {
  slots: ParkingSlot[];
  vehicles: VehicleRecord[];
  alerts: AlertRecord[];
  sensors: SensorState;
  device: DeviceState;
  daily: DailyStat[];
  /** "firebase" when a real Firebase config is provided, otherwise "simulation" */
  source: "firebase" | "simulation";
  connected: boolean;
}
