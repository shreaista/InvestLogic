import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn(
      "mb-8 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between",
      className
    )}>
      <div className="space-y-2">
        <h1 className="text-[1.6875rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[1.75rem]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm font-normal leading-relaxed text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="mt-4 sm:mt-0 flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
