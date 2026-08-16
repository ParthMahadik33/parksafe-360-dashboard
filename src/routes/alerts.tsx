import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, BellOff, CheckCircle2 } from "lucide-react";
import { AppLayout } from "@/components/safepark/AppLayout";
import { StatusBadge, type Tone } from "@/components/safepark/StatusBadge";
import { useSafepark } from "@/hooks/useSafepark";
import { fmtDateTime, slotLabel } from "@/lib/safepark/format";
import { resolveAlert } from "@/lib/safepark/store";
import type { AlertSeverity } from "@/lib/safepark/types";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts & Wrong Parking — SAFEPARK 360" },
      {
        name: "description",
        content:
          "Reserved-slot violations, unauthorised RFID attempts and smoke alarms with full alert history from Firebase.",
      },
      { property: "og:title", content: "Alerts & Wrong Parking — SAFEPARK 360" },
      {
        property: "og:description",
        content: "Live wrong-parking detection and alert history for the SAFEPARK 360 smart parking system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Alerts,
});

const severityTone: Record<AlertSeverity, Tone> = {
  critical: "danger",
  warning: "warning",
  info: "info",
};

function Alerts() {
  const s = useSafepark();
  const active = s.alerts.filter((a) => !a.resolved);
  const history = s.alerts;

  return (
    <AppLayout title="Alerts & Notifications" subtitle="Wrong parking, unauthorised access and safety alarms">
      {active.length === 0 ? (
        <div className="card-elevated flex flex-col items-center gap-2 p-10 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-success/12 text-success">
            <CheckCircle2 className="size-6" />
          </span>
          <p className="text-sm font-semibold">No active alerts</p>
          <p className="text-xs text-muted-foreground">
            All 5 slots, the reserved slot and safety sensors are operating normally.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {active.map((a) => (
            <div
              key={a.id}
              className={`card-elevated p-4 ${a.severity === "critical" ? "glow-ring border-destructive" : ""}`}
            >
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
                  <AlertTriangle className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold">{a.title}</p>
                    <StatusBadge tone={severityTone[a.severity]}>{a.severity}</StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.message}</p>
                  <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11px] text-muted-foreground">
                    <span>{slotLabel(a.slot)}</span>
                    <span>{a.vehicleNumber ?? "no plate"}</span>
                    <span>{fmtDateTime(a.timestamp)}</span>
                  </div>
                  <button
                    onClick={() => resolveAlert(a.id)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <BellOff className="size-3.5" /> Acknowledge
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="card-elevated overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-bold">Alert History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-surface-2/60 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                {["Time", "Type", "Slot", "Vehicle", "Severity", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((a) => (
                <tr key={a.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-mono">{fmtDateTime(a.timestamp)}</td>
                  <td className="px-4 py-3">{a.type.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">{slotLabel(a.slot)}</td>
                  <td className="px-4 py-3 font-mono">{a.vehicleNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={severityTone[a.severity]} dot={false}>
                      {a.severity}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={a.resolved ? "success" : "danger"} dot={false}>
                      {a.resolved ? "Resolved" : "Active"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-muted-foreground">
                    No alerts have been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppLayout>
  );
}
