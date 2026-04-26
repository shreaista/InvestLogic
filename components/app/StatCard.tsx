import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
  /** Soft tinted icon circle: amber, blue, emerald, violet */
  iconTint?: "amber" | "blue" | "emerald" | "violet";
  /** Optional className for the value (metric number) */
  valueClassName?: string;
  /** Optional className for the icon wrapper (overrides iconTint when set) */
  iconClassName?: string;
}

const iconTintStyles: Record<NonNullable<StatCardProps["iconTint"]>, string> = {
  amber: "bg-amber-500/10 text-amber-800",
  blue: "bg-primary/10 text-primary",
  emerald: "bg-emerald-600/10 text-emerald-800",
  violet: "bg-primary/10 text-primary",
};

/** Info / warning / success — muted, enterprise */
const valueTintStyles: Record<NonNullable<StatCardProps["iconTint"]>, string> = {
  blue: "text-primary",
  amber: "text-amber-950/88",
  emerald: "text-emerald-900/95",
  violet: "text-primary",
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  iconTint,
  valueClassName,
  iconClassName,
}: StatCardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-slate-200/85 bg-white p-5 shadow-card transition-shadow duration-200 hover:shadow-card-hover dark:border-border dark:bg-card",
        "sm:p-6",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-muted-foreground">
            {title}
          </p>
          <p
            className={cn(
              "text-4xl font-bold tracking-tight tabular-nums",
              valueClassName ?? (iconTint ? valueTintStyles[iconTint] : "text-foreground")
            )}
          >
            {value}
          </p>
          {description && (
            <div className="flex items-center gap-1.5 pt-0.5">
              {trend && trend !== "neutral" && (
                <TrendIcon
                  className={cn("h-3.5 w-3.5 shrink-0", {
                    "text-success": trend === "up",
                    "text-destructive": trend === "down",
                  })}
                />
              )}
              <p
                className={cn("text-xs truncate", {
                  "text-success": trend === "up",
                  "text-destructive": trend === "down",
                  "text-muted-foreground": trend === "neutral" || !trend,
                })}
              >
                {description}
              </p>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "shrink-0 rounded-xl p-3 transition-colors",
              iconClassName ?? (iconTint ? iconTintStyles[iconTint] : "bg-primary/5 text-primary group-hover:bg-primary/10")
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
