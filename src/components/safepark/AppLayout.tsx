import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Car,
  Cpu,
  LayoutDashboard,
  Menu,
  ShieldAlert,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useSafepark } from "@/hooks/useSafepark";
import { StatusBadge } from "./StatusBadge";
import { fmtTime } from "@/lib/safepark/format";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/vehicles", label: "Vehicle Records", icon: Car },
  { to: "/alerts", label: "Alerts", icon: AlertTriangle },
  { to: "/safety", label: "Safety Monitoring", icon: ShieldAlert },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/setup", label: "Setup & Hardware", icon: Cpu },
] as const;

export function AppLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const state = useSafepark();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const activeAlerts = state.alerts.filter((a) => !a.resolved).length;

  return (
    <div className="min-h-screen bg-background">
      {/* ---------- Sidebar ---------- */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <Activity className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold tracking-tight">SAFEPARK 360</p>
            <p className="truncate text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Smart Parking
            </p>
          </div>
          <button
            className="ml-auto text-muted-foreground lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = path === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary/15 text-sidebar-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
                {to === "/alerts" && activeAlerts > 0 && (
                  <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 font-mono text-[10px] font-bold text-destructive-foreground">
                    {activeAlerts}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-sidebar-border p-3 text-xs">
          <div className="flex items-center justify-between gap-2 rounded-lg bg-sidebar-accent/60 px-3 py-2">
            <span className="text-muted-foreground">Firebase</span>
            <StatusBadge tone={state.connected ? "success" : "danger"}>
              {state.source === "firebase" ? "Live" : "Simulated"}
            </StatusBadge>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg bg-sidebar-accent/60 px-3 py-2">
            <span className="text-muted-foreground">ESP32</span>
            <StatusBadge tone={state.device.online ? "success" : "danger"}>
              {state.device.online ? "Online" : "Offline"}
            </StatusBadge>
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ---------- Main ---------- */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 sm:px-6">
            <button
              className="rounded-lg border border-border p-2 text-muted-foreground lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold sm:text-lg">{title}</h1>
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground sm:flex">
                {state.device.online ? (
                  <Wifi className="size-3.5 text-success" />
                ) : (
                  <WifiOff className="size-3.5 text-destructive" />
                )}
                <span className="font-mono">{fmtTime(state.device.lastSeen)}</span>
              </span>
              <StatusBadge tone={activeAlerts ? "danger" : "success"}>
                {activeAlerts ? `${activeAlerts} alert${activeAlerts > 1 ? "s" : ""}` : "All clear"}
              </StatusBadge>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6">{children}</main>

        <footer className="border-t border-border px-6 py-5 text-center text-xs text-muted-foreground">
          SAFEPARK 360 · Smart Parking. Safer Mobility. Real-Time Control. · ESP32 + Firebase IoT
        </footer>
      </div>
    </div>
  );
}
