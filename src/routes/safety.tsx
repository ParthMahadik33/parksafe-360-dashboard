import { createFileRoute } from "@tanstack/react-router";
import { AlertOctagon, BellRing, Cpu, DoorOpen, Flame, Radar, ShieldCheck, Wifi } from "lucide-react";
import { AppLayout } from "@/components/safepark/AppLayout";
import { StatusBadge, type Tone } from "@/components/safepark/StatusBadge";
import { useSafepark } from "@/hooks/useSafepark";
import { fmtDateTime } from "@/lib/safepark/format";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety Monitoring — SAFEPARK 360" },
      {
        name: "description",
        content:
          "MQ-2 smoke sensing, IR gate detection, buzzer state and ESP32 connectivity health for the parking area.",
      },
      { property: "og:title", content: "Safety Monitoring — SAFEPARK 360" },
      {
        property: "og:description",
        content: "Live smoke, IR, buzzer and ESP32 device health monitoring for the smart parking area.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Safety,
});

function SensorTile({
  icon: Icon,
  title,
  value,
  tone,
  state,
  note,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  tone: Tone;
  state: string;
  note: string;
}) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-surface-2 text-primary">
          <Icon className="size-4" />
        </span>
        <p className="min-w-0 truncate text-sm font-semibold">{title}</p>
        <StatusBadge tone={tone} className="ml-auto">
          {state}
        </StatusBadge>
      </div>
      <p className="mt-3 font-mono text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function Safety() {
  const s = useSafepark();
  const ppm = s.sensors.mq2Ppm;
  const smokeTone: Tone = ppm > 600 ? "danger" : ppm > 400 ? "warning" : "success";
  const smokeState = ppm > 600 ? "Critical" : ppm > 400 ? "Warning" : "Normal";

  return (
    <AppLayout title="Safety Monitoring" subtitle="MQ-2 smoke, IR detection, buzzer and device health">
      {s.sensors.smokeAlert && (
        <div className="card-elevated glow-ring border-destructive bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertOctagon className="size-6 shrink-0 text-destructive" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-destructive">
                Smoke / gas detected in the parking area
              </p>
              <p className="text-xs text-muted-foreground">
                MQ-2 reading {ppm} ppm exceeded the 600 ppm threshold. Buzzer activated and the exit gate
                servo was released for evacuation.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SensorTile
          icon={Flame}
          title="MQ-2 Smoke Sensor"
          value={`${ppm} ppm`}
          tone={smokeTone}
          state={smokeState}
          note="Threshold 600 ppm · analog pin GPIO34"
        />
        <SensorTile
          icon={ShieldCheck}
          title="Parking Area Safety"
          value={s.sensors.smokeAlert ? "UNSAFE" : "SAFE"}
          tone={s.sensors.smokeAlert ? "danger" : "success"}
          state={s.sensors.smokeAlert ? "Critical" : "Normal"}
          note="Derived from MQ-2 + active alert list"
        />
        <SensorTile
          icon={DoorOpen}
          title="IR Sensor (Gate)"
          value={s.sensors.irEntry ? "TRIGGERED" : "CLEAR"}
          tone={s.sensors.irStatus === "fault" ? "danger" : s.sensors.irEntry ? "info" : "success"}
          state={s.sensors.irStatus === "fault" ? "Offline" : "Normal"}
          note="Confirms a vehicle is physically at the gate"
        />
        <SensorTile
          icon={BellRing}
          title="Buzzer"
          value={s.sensors.buzzer ? "ON" : "OFF"}
          tone={s.sensors.buzzer ? "danger" : "neutral"}
          state={s.sensors.buzzer ? "Warning" : "Normal"}
          note="Fires on smoke alert or reserved-slot violation"
        />
        <SensorTile
          icon={Radar}
          title="Ultrasonic Array"
          value={`${s.sensors.ultrasonicOnline}/5`}
          tone={s.sensors.ultrasonicOnline === 5 ? "success" : "warning"}
          state={s.sensors.ultrasonicOnline === 5 ? "Normal" : "Warning"}
          note="HC-SR04 sensors, one per parking slot"
        />
        <SensorTile
          icon={Cpu}
          title="ESP32 Connection"
          value={s.device.online ? "ONLINE" : "OFFLINE"}
          tone={s.device.online ? "success" : "danger"}
          state={s.device.online ? "Normal" : "Offline"}
          note={`Last heartbeat ${fmtDateTime(s.device.lastSeen)}`}
        />
      </section>

      <section className="card-elevated p-4">
        <div className="flex items-center gap-2">
          <Wifi className="size-4 text-primary" />
          <h3 className="text-sm font-bold">Device & Network Diagnostics</h3>
        </div>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-3">
          {[
            ["Wi-Fi SSID", s.device.wifiSsid],
            ["Signal strength", `${s.device.wifiRssi} dBm`],
            ["Firebase link", s.device.firebaseConnected ? "Connected" : "Disconnected"],
            ["Firmware", s.device.firmware],
            ["Uptime", `${Math.floor(s.device.uptimeSec / 3600)}h ${Math.floor((s.device.uptimeSec % 3600) / 60)}m`],
            ["Gate servo", s.sensors.gate === "open" ? "Open" : "Closed"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between gap-2 rounded-lg bg-surface-2/70 px-3 py-2"
            >
              <span className="text-muted-foreground">{k}</span>
              <span className="truncate font-mono">{v}</span>
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
