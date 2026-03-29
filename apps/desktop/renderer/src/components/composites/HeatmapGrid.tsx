import { cn } from '@/lib/cn';

export interface HeatmapGridProps {
  data: number[][];
  className?: string;
}

const intensityClasses = [
  'bg-[var(--color-card)]',
  'bg-accent/15',
  'bg-accent/35',
  'bg-accent/60',
  'bg-accent',
] as const;

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function HeatmapGrid({ data, className }: HeatmapGridProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {/* Month labels */}
      <div className="flex ml-0">
        {MONTH_LABELS.map((month) => (
          <span
            key={month}
            className="text-[10px] text-muted-foreground"
            style={{ width: `${(52 / 12) * 12}px` }}
          >
            {month}
          </span>
        ))}
      </div>
      {/* Grid */}
      <div className="flex gap-[2px]">
        {data.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[2px]">
            {week.map((level, di) => (
              <div
                key={di}
                className={cn(
                  'w-[10px] h-[10px] rounded-sm',
                  intensityClasses[Math.min(level, 4)],
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
