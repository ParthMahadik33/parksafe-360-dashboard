import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "danger" | "warning" | "info";
}) {
  const toneMap = {
    primary: "bg-primary/12 text-primary",
    success: "bg-success/12 text-success",
    danger: "bg-destructive/12 text-destructive",
    warning: "bg-warning/12 text-warning",
    info: "bg-info/12 text-info",
  } as const;

  return (
    <div className="card-elevated group relative overflow-hidden p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-mono text-3xl font-bold leading-none">{value}</p>
          {hint && <p className="mt-2 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", toneMap[tone])}>
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}
