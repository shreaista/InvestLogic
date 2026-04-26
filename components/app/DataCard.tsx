import { cn } from "@/lib/utils";

interface DataCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  noPadding?: boolean;
  /** Merged onto the body wrapper (below header); use with `className` `flex flex-col h-full` for fill layouts */
  bodyClassName?: string;
  /** Merged onto the title row (below accent border); e.g. tighter padding for compact cards */
  headerClassName?: string;
  /** Merged onto the description line under the title */
  descriptionClassName?: string;
  titleClassName?: string;
  titleBadges?: React.ReactNode;
  /** Subtle colored top border: amber, blue, violet, indigo, emerald, rose */
  accent?: "amber" | "blue" | "violet" | "indigo" | "emerald" | "rose";
}

const accentBorder: Record<NonNullable<DataCardProps["accent"]>, string> = {
  amber: "border-t-2 border-t-warning/70",
  blue: "border-t-2 border-t-primary/70",
  violet: "border-t-2 border-t-primary/55",
  indigo: "border-t-2 border-t-primary/70",
  emerald: "border-t-2 border-t-success/70",
  rose: "border-t-2 border-t-destructive/55",
};

export function DataCard({
  title,
  description,
  children,
  className,
  actions,
  noPadding = false,
  bodyClassName,
  headerClassName,
  descriptionClassName,
  titleClassName,
  titleBadges,
  accent,
}: DataCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] border border-slate-200/80 bg-white shadow-card transition-shadow duration-200 ease-out hover:shadow-card-hover dark:border-border/80 dark:bg-card",
        accent && accentBorder[accent],
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-[18px] sm:px-6 sm:py-5 dark:border-border dark:bg-card",
          headerClassName
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={cn(
                "truncate text-[1.3125rem] font-semibold tracking-tight text-foreground sm:text-[1.375rem]",
                titleClassName
              )}
            >
              {title}
            </h3>
            {titleBadges}
          </div>
          {description && (
            <p
              className={cn(
                "mt-1 line-clamp-2 text-sm font-normal leading-relaxed text-muted-foreground",
                descriptionClassName
              )}
            >
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div
        className={cn(!noPadding && "p-5 sm:p-6", bodyClassName)}
      >
        {children}
      </div>
    </div>
  );
}
