import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BellRing,
  Car,
  CircleParking,
  CircleSlash,
  Lock,
  ShieldCheck,
  Cpu,
  Radio,
  Flame,
  DoorOpen,
} from "lucide-react";
import { AppLayout } from "@/components/safepark/AppLayout";
import { SlotCard } from "@/components/safepark/SlotCard";
import { StatCard } from "@/components/safepark/StatCard";
import { StatusBadge } from "@/components/safepark/StatusBadge";
import { useSafepark } from "@/hooks/useSafepark";
import { fmtDateTime, fmtDuration, fmtTime, isToday, liveDuration, slotLabel } from "@/lib/safepark/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SAFEPARK 360 — Intelligent Smart Parking Dashboard" },
      {
        name: "description",
        content:
          "Real-time ESP32 + Firebase smart parking dashboard: 5 slot monitoring, RFID entry/exit, reserved-slot alerts and safety sensors.",
      },
      { property: "og:title", content: "SAFEPARK 360 — Intelligent Smart Parking System" },
      {
        property: "og:description",
        content: "Smart Parking. Safer Mobility. Real-Time Control. Live IoT parking dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const s = useSafepark();

  const available = s.slots.filter((x) => x.status === "available").length;
  const occupied = s.slots.filter((x) => x.status === "occupied").length;
  const reserved = s.slots.filter((x) => x.isReserved).length;
  const inside = s.vehicles.filter((v) => v.status === "inside");
  const entriesToday = s.vehicles.filter((v) => isToday(v.entryTime)).length;
  const exitsToday = s.vehicles.filter((v) => isToday(v.exitTime)).length;
  const activeAlerts = s.alerts.filter((a) => !a.resolved);
  const wrongParking = activeAlerts.find((a) => a.type === "wrong_parking");
  const reservedSlot = s.slots.find((x) => x.isReserved)!;
  const recent = s.vehicles.slice(0, 6);

  return (
    <AppLayout title="Dashboard Overview" subtitle="Smart Parking. Safer Mobility. Real-Time Control.">
      {/* Hero */}
      <section className="card-elevated relative overflow-hidden p-5 sm:p-6">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="relative grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              Intelligent Smart Parking System
            </p>
            <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">SAFEPARK 360</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Live monitoring of 5 parking slots with RFID access control, wrong-parking detection and
              MQ-2 safety sensing — streamed from the ESP32 through Firebase in real time.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={s.source === "firebase" ? "success" : "info"}>
              {s.source === "firebase" ? "Firebase live" : "Simulation mode"}
            </StatusBadge>
            <StatusBadge tone={s.device.online ? "success" : "danger"}>
              ESP32 {s.device.online ? "online" : "offline"}
            </StatusBadge>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Total Slots" value={5} icon={CircleParking} />
        <StatCard label="Available" value={available} icon={ShieldCheck} tone="success" />
        <StatCard label="Occupied" value={occupied} icon={CircleSlash} tone="danger" />
        <StatCard label="Reserved" value={reserved} icon={Lock} tone="warning" />
        <StatCard label="Vehicles Inside" value={inside.length} icon={Car} tone="info" />
        <StatCard label="Today's Entries" value={entriesToday} icon={ArrowDownLeft} tone="success" />
        <StatCard label="Today's Exits" value={exitsToday} icon={ArrowUpRight} tone="info" />
        <StatCard
          label="Active Alerts"
          value={activeAlerts.length}
          icon={BellRing}
          tone={activeAlerts.length ? "danger" : "success"}
        />
      </section>

      {/* Wrong parking banner */}
      {wrongParking && (
        <section className="card-elevated glow-ring border-destructive bg-destructive/10 p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/20 text-destructive">
                <AlertTriangle className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-destructive">Reserved Slot Occupied</p>
                <p className="text-xs text-muted-foreground">
                  {slotLabel(wrongParking.slot)} · Vehicle{" "}
                  <span className="font-mono">{wrongParking.vehicleNumber ?? "unknown"}</span> ·{" "}
                  {fmtDateTime(wrongParking.timestamp)}
                </p>
              </div>
            </div>
            <Link
              to="/alerts"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-destructive px-3.5 py-2 text-xs font-semibold text-destructive-foreground"
            >
              View alert history
            </Link>
          </div>
        </section>
      )}

      {/* Slots */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Real-time Parking Status
          </h3>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <StatusBadge tone="success" dot={false}>🟢 Available</StatusBadge>
            <StatusBadge tone="danger" dot={false}>🔴 Occupied</StatusBadge>
            <StatusBadge tone="warning" dot={false}>🟡 Reserved</StatusBadge>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {s.slots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              violation={Boolean(wrongParking && wrongParking.slot === slot.id)}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Entry / exit monitoring */}
        <section className="card-elevated xl:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h3 className="text-sm font-bold">RFID Entry / Exit Monitoring</h3>
            <Link to="/vehicles" className="text-xs font-semibold text-primary">
              View all records
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 font-semibold">Vehicle</th>
                  <th className="px-4 py-2.5 font-semibold">RFID Card</th>
                  <th className="px-4 py-2.5 font-semibold">Slot</th>
                  <th className="px-4 py-2.5 font-semibold">Entry</th>
                  <th className="px-4 py-2.5 font-semibold">Exit</th>
                  <th className="px-4 py-2.5 font-semibold">Duration</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((v) => (
                  <tr key={v.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5 font-mono font-semibold">{v.vehicleNumber}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{v.rfid}</td>
                    <td className="px-4 py-2.5">{slotLabel(v.slot)}</td>
                    <td className="px-4 py-2.5 font-mono">{fmtTime(v.entryTime)}</td>
                    <td className="px-4 py-2.5 font-mono">{fmtTime(v.exitTime)}</td>
                    <td className="px-4 py-2.5 font-mono">
                      {v.status === "inside" ? liveDuration(v.entryTime) : fmtDuration(v.durationMs)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge tone={v.status === "inside" ? "info" : "neutral"} dot={false}>
                        {v.status === "inside" ? "Inside" : "Exited"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      No vehicle activity recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Device + reserved + safety snapshot */}
        <section className="space-y-4">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <Cpu className="size-4 text-primary" />
              <h3 className="text-sm font-bold">ESP32 Device Status</h3>
              <StatusBadge tone={s.device.online ? "success" : "danger"} className="ml-auto">
                {s.device.online ? "Online" : "Offline"}
              </StatusBadge>
            </div>
            <dl className="mt-3 space-y-2 text-xs">
              {[
                ["Last data received", fmtDateTime(s.device.lastSeen)],
                ["Wi-Fi", `${s.device.wifiSsid} (${s.device.wifiRssi} dBm)`],
                ["Firebase", s.device.firebaseConnected ? "Connected" : "Disconnected"],
                ["Ultrasonic sensors", `${s.sensors.ultrasonicOnline}/5 responding`],
                ["Gate / servo", s.sensors.gate === "open" ? "Open" : "Closed"],
                ["Firmware", s.device.firmware],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="truncate font-mono">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-warning" />
              <h3 className="text-sm font-bold">Reserved Slot Monitoring</h3>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Slot {reservedSlot.number} is reserved. Any vehicle without a matching authorised RFID
              triggers a wrong-parking alert.
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-surface-2/70 px-3 py-2 text-xs">
              <span className="text-muted-foreground">Current state</span>
              <StatusBadge tone={reservedSlot.status === "occupied" ? "danger" : "warning"}>
                {reservedSlot.status === "occupied" ? "Occupied" : "Free / Reserved"}
              </StatusBadge>
            </div>
          </div>

          <div className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <Radio className="size-4 text-primary" />
              <h3 className="text-sm font-bold">Safety Snapshot</h3>
              <Link to="/safety" className="ml-auto text-xs font-semibold text-primary">
                Details
              </Link>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <Row icon={<Flame className="size-3.5" />} label="MQ-2 smoke">
                <StatusBadge tone={s.sensors.smokeAlert ? "danger" : "success"}>
                  {s.sensors.mq2Ppm} ppm
                </StatusBadge>
              </Row>
              <Row icon={<DoorOpen className="size-3.5" />} label="IR gate sensor">
                <StatusBadge tone={s.sensors.irEntry ? "info" : "neutral"} dot={false}>
                  {s.sensors.irEntry ? "Vehicle detected" : "Clear"}
                </StatusBadge>
              </Row>
              <Row icon={<BellRing className="size-3.5" />} label="Buzzer">
                <StatusBadge tone={s.sensors.buzzer ? "danger" : "neutral"} dot={false}>
                  {s.sensors.buzzer ? "Active" : "Silent"}
                </StatusBadge>
              </Row>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-2/70 px-3 py-2">
      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {children}
    </div>
  );
}
