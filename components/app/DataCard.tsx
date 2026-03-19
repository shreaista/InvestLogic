import { cn } from "@/lib/utils";

interface DataCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  noPadding?: boolean;
  titleClassName?: string;
  titleBadges?: React.ReactNode;
}

export function DataCard({
  title,
  description,
  children,
  className,
  actions,
  noPadding = false,
  titleClassName,
  titleBadges,
}: DataCardProps) {
  return (
    <div
    className={cn(
      "rounded-2xl border border-gray-200 bg-card overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
      className
    )}
  >
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-200/80 bg-muted/30">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={cn("text-lg font-semibold truncate", titleClassName)}>{title}</h3>
            {titleBadges}
          </div>
          {description && (
            <p className="text-sm text-gray-500 mt-0.5 truncate font-normal">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className={cn({ "p-5 sm:p-6": !noPadding })}>{children}</div>
    </div>
  );
}
