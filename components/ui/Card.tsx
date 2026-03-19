import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Card({ children, className, title, subtitle, action }: CardProps) {
  return (
    <div className={cn("mc-card p-4", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-3">
          <div>
            {title && (
              <h2 className="text-sm font-semibold text-text-primary tracking-wide uppercase">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="ml-3 flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
