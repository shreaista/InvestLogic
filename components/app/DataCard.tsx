import { cn } from "@/lib/utils";

interface DataCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  noPadding?: boolean;
}

export function DataCard({
  title,
  description,
  children,
  className,
  actions,
  noPadding = false,
}: DataCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-shadow duration-200",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b bg-muted/20">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className={cn({ "p-5": !noPadding })}>{children}</div>
    </div>
  );
}
