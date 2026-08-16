import { createFileRoute } from "@tanstack/react-router";
import { Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/safepark/AppLayout";
import { StatusBadge } from "@/components/safepark/StatusBadge";
import { useSafepark } from "@/hooks/useSafepark";
import { fmtDateTime, fmtDuration, liveDuration, slotLabel } from "@/lib/safepark/format";

export const Route = createFileRoute("/vehicles")({
  head: () => ({
    meta: [
      { title: "Vehicle Records — SAFEPARK 360" },
      {
        name: "description",
        content:
          "Searchable RFID vehicle records: entry time, exit time, slot, parking duration and status, stored in Firebase.",
      },
      { property: "og:title", content: "Vehicle Records — SAFEPARK 360" },
      {
        property: "og:description",
        content: "Search, filter and sort every RFID parking entry and exit recorded by SAFEPARK 360.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Vehicles,
});

const PAGE_SIZE = 10;

function Vehicles() {
  const s = useSafepark();
  const [q, setQ] = useState("");
  const [slot, setSlot] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "longest">("newest");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    let list = s.vehicles.filter((v) => {
      const text = `${v.vehicleNumber} ${v.rfid}`.toLowerCase();
      if (q && !text.includes(q.toLowerCase())) return false;
      if (slot !== "all" && v.slot !== slot) return false;
      if (status !== "all" && v.status !== status) return false;
      if (date) {
        const d = new Date(v.entryTime).toISOString().slice(0, 10);
        if (d !== date) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "oldest") return a.entryTime - b.entryTime;
      if (sort === "longest")
        return (b.durationMs ?? Date.now() - b.entryTime) - (a.durationMs ?? Date.now() - a.entryTime);
      return b.entryTime - a.entryTime;
    });
    return list;
  }, [s.vehicles, q, slot, status, date, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const view = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const exportCsv = () => {
    const head = "Vehicle,RFID,Slot,Entry,Exit,Duration,Status,Authorised";
    const body = rows
      .map((v) =>
        [
          v.vehicleNumber,
          v.rfid,
          slotLabel(v.slot),
          fmtDateTime(v.entryTime),
          fmtDateTime(v.exitTime),
          fmtDuration(v.durationMs),
          v.status,
          v.authorised ? "Authorised" : "Unauthorised",
        ].join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([`${head}\n${body}`], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "safepark360-vehicle-records.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectCls =
    "rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground outline-none focus:border-primary";

  return (
    <AppLayout title="Vehicle Records" subtitle="Every RFID entry and exit stored in Firebase">
      <div className="card-elevated p-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search vehicle number or RFID..."
              className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-xs outline-none focus:border-primary"
            />
          </div>
          <select value={slot} onChange={(e) => setSlot(e.target.value)} className={selectCls}>
            <option value="all">All slots</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={`slot${n}`}>
                Slot {n}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
            <option value="all">All statuses</option>
            <option value="inside">Inside</option>
            <option value="exited">Exited</option>
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={selectCls}
          />
          <div className="flex gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className={`${selectCls} flex-1`}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="longest">Longest stay</option>
            </select>
            <button
              onClick={exportCsv}
              className="grid shrink-0 place-items-center rounded-lg border border-border bg-surface px-3 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              aria-label="Export CSV"
            >
              <Download className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="bg-surface-2/60 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                {["Vehicle Number", "RFID Number", "Slot", "Entry Time", "Exit Time", "Duration", "Status"].map(
                  (h) => (
                    <th key={h} className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {view.map((v) => (
                <tr key={v.id} className="border-t border-border/60 hover:bg-surface-2/40">
                  <td className="px-4 py-3 font-mono font-semibold">{v.vehicleNumber}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{v.rfid}</td>
                  <td className="px-4 py-3">{slotLabel(v.slot)}</td>
                  <td className="px-4 py-3 font-mono">{fmtDateTime(v.entryTime)}</td>
                  <td className="px-4 py-3 font-mono">{fmtDateTime(v.exitTime)}</td>
                  <td className="px-4 py-3 font-mono">
                    {v.status === "inside" ? liveDuration(v.entryTime) : fmtDuration(v.durationMs)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge tone={v.status === "inside" ? "info" : "neutral"} dot={false}>
                        {v.status === "inside" ? "Inside" : "Exited"}
                      </StatusBadge>
                      <StatusBadge tone={v.authorised ? "success" : "danger"} dot={false}>
                        {v.authorised ? "Authorised" : "Unauthorised"}
                      </StatusBadge>
                    </div>
                  </td>
                </tr>
              ))}
              {view.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-muted-foreground">
                    No records match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs">
          <span className="text-muted-foreground">
            Showing {view.length} of {rows.length} records
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
              className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono">
              {current} / {pages}
            </span>
            <button
              disabled={current >= pages}
              onClick={() => setPage(current + 1)}
              className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
