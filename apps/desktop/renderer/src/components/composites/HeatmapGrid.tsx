import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@/components/primitives';
import { cn } from '@/lib/cn';

export interface HeatmapGridProps {
  data: Array<{ date: string; count: number }>;
  maxCount?: number;
  className?: string;
}

const WEEKS = 52;
const DAYS = 7;

function getLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const LEVEL_CLASSES: Record<number, string> = {
  0: 'bg-heatmap-0',
  1: 'bg-heatmap-1',
  2: 'bg-heatmap-2',
  3: 'bg-heatmap-3',
  4: 'bg-heatmap-4',
};

export function HeatmapGrid({ data, maxCount, className }: HeatmapGridProps) {
  const { t } = useTranslation();

  const { grid } = useMemo(() => {
    const lookup = new Map(data.map((d) => [d.date, d.count]));
    const computedMax = maxCount ?? Math.max(...data.map((d) => d.count), 1);

    const today = new Date();
    const cells: Array<{ date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }> = [];

    const endDay = today.getDay();
    const totalCells = WEEKS * DAYS;
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - totalCells + (DAYS - endDay));

    for (let i = 0; i < totalCells; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = lookup.get(dateStr) ?? 0;
      cells.push({ date: dateStr, count, level: getLevel(count, computedMax) });
    }

    return { grid: cells, effectiveMax: computedMax };
  }, [data, maxCount]);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="text-xs text-muted-foreground mb-1">
        {t('dashboard.heatmap.title')}
      </div>
      <div
        className="grid gap-[3px]"
        style={{
          gridTemplateColumns: `repeat(${WEEKS}, 1fr)`,
          gridTemplateRows: `repeat(${DAYS}, 1fr)`,
          gridAutoFlow: 'column',
        }}
      >
        {grid.map((cell) => (
          <Tooltip
            key={cell.date}
            content={`${cell.date}: ${t('dashboard.heatmap.words', { count: cell.count })}`}
            side="top"
          >
            <div
              className={cn(
                'aspect-square rounded-[2px] transition-colors duration-fast ease-out',
                LEVEL_CLASSES[cell.level],
              )}
            />
          </Tooltip>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-1 justify-end">
        <span className="text-[10px] text-muted-foreground mr-1">
          {t('dashboard.heatmap.less')}
        </span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn('w-2.5 h-2.5 rounded-[2px]', LEVEL_CLASSES[level])}
          />
        ))}
        <span className="text-[10px] text-muted-foreground ml-1">
          {t('dashboard.heatmap.more')}
        </span>
      </div>
    </div>
  );
}
