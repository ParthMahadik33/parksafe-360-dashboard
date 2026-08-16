import { Car, Clock, Radar, ShieldCheck } from "lucide-react";
import { StatusBadge, type Tone } from "./StatusBadge";
import { fmtTime, liveDuration } from "@/lib/safepark/format";
import type { ParkingSlot } from "@/lib/safepark/types";
import { cn } from "@/lib/utils";

// 🟢 Available | 🔴 Occupied | 🟡 Reserved
const view: Record<ParkingSlot["status"], { tone: Tone; label: string; ring: string }> = {
  available: { tone: "success", label: "Available", ring: "border-success/40" },
  occupied: { tone: "danger", label: "Occupied", ring: "border-destructive/50" },
  reserved: { tone: "warning", label: "Reserved", ring: "border-warning/45" },
};

export function SlotCard({ slot, violation }: { slot: ParkingSlot; violation: boolean }) {
  const v = view[slot.status];
  return (
    <div
      className={cn(
        "card-elevated relative flex flex-col gap-3 border p-4 transition-all hover:-translate-y-0.5",
        v.ring,
        violation && "glow-ring border-destructive",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 font-mono text-sm font-bold">
            {slot.number}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Slot {slot.number}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {slot.isReserved ? "Reserved slot" : "Normal slot"}
            </p>
          </div>
        </div>
        <StatusBadge tone={v.tone}>{v.label}</StatusBadge>
      </div>

      <div className="space-y-1.5 rounded-lg bg-surface-2/60 p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Car className="size-3.5" /> Vehicle
          </span>
          <span className="truncate font-mono font-semibold">{slot.vehicleNumber ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-3.5" /> Entry
          </span>
          <span className="font-mono">{fmtTime(slot.entryTime)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Parked for
          </span>
          <span className="font-mono">{slot.entryTime ? liveDuration(slot.entryTime) : "—"}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Radar className="size-3.5" /> Ultrasonic
          </span>
          <span className={cn("font-mono", slot.sensor === "ok" ? "text-success" : "text-destructive")}>
            {slot.sensor === "ok" ? `${slot.distanceCm} cm` : "FAULT"}
          </span>
        </div>
      </div>

      {violation && (
        <p className="rounded-md bg-destructive/15 px-2.5 py-1.5 text-[11px] font-semibold text-destructive">
          Wrong parking — unauthorised vehicle in reserved slot
        </p>
      )}
    </div>
  );
}
