// Small formatting helpers shared by every SAFEPARK 360 page.

export const fmtTime = (ts: number | null) =>
  ts
    ? new Date(ts).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : "—";

export const fmtDateTime = (ts: number | null) =>
  ts
    ? new Date(ts).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

/** Parking duration in "2h 14m" form. */
export const fmtDuration = (ms: number | null) => {
  if (ms == null) return "—";
  const mins = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

export const liveDuration = (entry: number | null) =>
  entry == null ? "—" : fmtDuration(Date.now() - entry);

export const isToday = (ts: number | null) => {
  if (!ts) return false;
  const d = new Date(ts);
  const n = new Date();
  return (
    d.getDate() === n.getDate() &&
    d.getMonth() === n.getMonth() &&
    d.getFullYear() === n.getFullYear()
  );
};

export const slotLabel = (id: string | null) =>
  id ? `Slot ${id.replace("slot", "")}` : "—";
