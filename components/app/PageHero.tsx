import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export type PageHeroVariant =
  | "funds"
  | "proposals"
  | "reports"
  | "audit"
  | "default";

/** White surface, soft border — no gradients (InvestLogic finance theme). */
const variantSurfaces: Record<PageHeroVariant, string> = {
  funds: "bg-card border border-border shadow-soft",
  proposals: "bg-card border border-border shadow-soft",
  reports: "bg-card border border-border shadow-soft",
  audit: "bg-card border border-border shadow-soft",
  default: "bg-card border border-border shadow-soft",
};

interface PageHeroProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  variant?: PageHeroVariant;
  icon?: LucideIcon;
  className?: string;
}

export function PageHero({ title, subtitle, actions, variant = "default", icon: Icon, className }: PageHeroProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-6 shadow-sm transition-all",
        variantSurfaces[variant],
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              variant === "funds" && "bg-warning/10 text-warning",
              variant === "proposals" && "bg-primary/10 text-primary",
              variant === "reports" && "bg-success/10 text-success",
              variant === "audit" && "bg-muted text-muted-foreground",
              variant === "default" && "bg-muted text-muted-foreground"
            )}>
              <Icon className="h-6 w-6" />
            </div>
          )}
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            {subtitle && (
              <div className="text-sm text-muted-foreground">{subtitle}</div>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
