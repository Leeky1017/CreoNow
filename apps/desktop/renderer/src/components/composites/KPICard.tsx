import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; direction: 'up' | 'down' };
  className?: string;
}

export function KPICard({ label, value, icon: Icon, trend, className }: KPICardProps) {
  return (
    <div
      className={cn(
        'bg-card rounded-lg border border-border p-4 flex flex-col gap-2',
        'transition-colors duration-fast ease-out',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-semibold text-foreground">{value}</span>
        {trend && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              trend.direction === 'up' ? 'text-accent' : 'text-destructive',
            )}
          >
            {trend.direction === 'up' ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}
