import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface KPICardProps {
  label: string;
  value: string | number;
  trend?: { direction: 'up' | 'down' | 'flat'; percentage: number };
  icon?: React.ReactNode;
}

const trendConfig = {
  up: { Icon: TrendingUp, color: 'text-accent' },
  down: { Icon: TrendingDown, color: 'text-destructive' },
  flat: { Icon: Minus, color: 'text-muted-foreground' },
} as const;

export function KPICard({ label, value, trend, icon }: KPICardProps) {
  return (
    <div className="bg-card rounded-lg p-4 border border-border">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <span className="text-muted-foreground">{icon}</span>
        )}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-2xl font-semibold text-foreground">{value}</span>
        {trend && <TrendIndicator trend={trend} />}
      </div>
    </div>
  );
}

function TrendIndicator({ trend }: { trend: NonNullable<KPICardProps['trend']> }) {
  const { Icon, color } = trendConfig[trend.direction];
  return (
    <span className={cn('flex items-center gap-0.5 text-xs', color)}>
      <Icon size={14} strokeWidth={1.5} />
      {trend.percentage}%
    </span>
  );
}
