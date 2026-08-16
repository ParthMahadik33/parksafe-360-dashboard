import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Reusable status badge built on design tokens (never hardcoded colors).
const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide",
  {
    variants: {
      tone: {
        success: "border-success/30 bg-success/12 text-success",
        danger: "border-destructive/35 bg-destructive/12 text-destructive",
        warning: "border-warning/35 bg-warning/12 text-warning",
        info: "border-info/35 bg-info/12 text-info",
        neutral: "border-border bg-muted/60 text-muted-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type Tone = NonNullable<VariantProps<typeof badge>["tone"]>;

export function StatusBadge({
  tone,
  children,
  dot = true,
  className,
}: VariantProps<typeof badge> & {
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={cn(badge({ tone }), className)}>
      {dot && <span className="size-1.5 rounded-full bg-current live-dot" />}
      {children}
    </span>
  );
}
