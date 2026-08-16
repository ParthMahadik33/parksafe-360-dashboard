import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/safepark/AppLayout";
import { StatCard } from "@/components/safepark/StatCard";
import { useSafepark } from "@/hooks/useSafepark";
import { fmtDuration, slotLabel } from "@/lib/safepark/format";
import { Clock, TrendingUp, Car, Gauge } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Parking Analytics — SAFEPARK 360" },
      {
        name: "description",
        content:
          "Daily entries and exits, slot occupancy, most-used slot and average parking duration charts built from live Firebase data.",
      },
      { property: "og:title", content: "Parking Analytics — SAFEPARK 360" },
      {
        property: "og:description",
        content: "Interactive charts for occupancy, daily traffic and average parking duration.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Analytics,
});

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.6rem",
  fontSize: 12,
  color: "var(--foreground)",
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-elevated p-4">
      <h3 className="text-sm font-bold">{title}</h3>
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}

function Analytics() {
  const s = useSafepark();

  const slotUsage = useMemo(
    () =>
      [1, 2, 3, 4, 5].map((n) => ({
        slot: `Slot ${n}`,
        uses: s.vehicles.filter((v) => v.slot === `slot${n}`).length,
      })),
    [s.vehicles],
  );

  const completed = s.vehicles.filter((v) => v.durationMs != null);
  const avgDuration = completed.length
    ? completed.reduce((a, v) => a + (v.durationMs ?? 0), 0) / completed.length
    : 0;

  const occupied = s.slots.filter((x) => x.status === "occupied").length;
  const available = s.slots.filter((x) => x.status === "available").length;
  const reserved = s.slots.filter((x) => x.status === "reserved").length;
  const occupancy = Math.round((occupied / 5) * 100);
  const mostUsed = [...slotUsage].sort((a, b) => b.uses - a.uses)[0];

  const pie = [
    { name: "Available", value: available, fill: "var(--chart-2)" },
    { name: "Occupied", value: occupied, fill: "var(--chart-4)" },
    { name: "Reserved", value: reserved, fill: "var(--chart-3)" },
  ].filter((d) => d.value > 0);

  return (
    <AppLayout title="Parking Analytics" subtitle="Traffic, occupancy and duration insights">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Occupancy Rate" value={`${occupancy}%`} icon={Gauge} tone="warning" />
        <StatCard
          label="Avg. Duration"
          value={fmtDuration(avgDuration)}
          icon={Clock}
          tone="info"
          hint={`${completed.length} completed sessions`}
        />
        <StatCard
          label="Most Used Slot"
          value={mostUsed?.slot ?? "—"}
          icon={Car}
          tone="success"
          hint={`${mostUsed?.uses ?? 0} vehicles parked`}
        />
        <StatCard
          label="Total Records"
          value={s.vehicles.length}
          icon={TrendingUp}
          hint="All entries stored in Firebase"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Daily Entries vs Exits (last 7 days)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={s.daily}>
              <defs>
                <linearGradient id="gEntries" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gExits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="entries"
                name="Entries"
                stroke="var(--chart-1)"
                fill="url(#gEntries)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="exits"
                name="Exits"
                stroke="var(--chart-3)"
                fill="url(#gExits)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Slot Usage (most-used parking slot)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={slotUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="slot" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
              <Bar dataKey="uses" name="Vehicles" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Available vs Occupied vs Reserved (live)">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {pie.map((d) => (
                  <Cell key={d.name} fill={d.fill} stroke="var(--card)" />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Weekly Parking Activity (total movements)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={s.daily.map((d) => ({ ...d, total: d.entries + d.exits }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
              <Bar dataKey="total" name="Movements" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <section className="card-elevated overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-bold">Longest Parking Sessions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="bg-surface-2/60 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                {["Vehicle", "Slot", "Duration"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...completed]
                .sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))
                .slice(0, 5)
                .map((v) => (
                  <tr key={v.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-mono font-semibold">{v.vehicleNumber}</td>
                    <td className="px-4 py-3">{slotLabel(v.slot)}</td>
                    <td className="px-4 py-3 font-mono">{fmtDuration(v.durationMs)}</td>
                  </tr>
                ))}
              {completed.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">
                    No completed parking sessions yet.
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
