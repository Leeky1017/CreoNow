import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea, Button } from '@/components/primitives';
import { cn } from '@/lib/cn';

/** Deterministic pseudo-random word count for a given date seed */
function mockWordCount(year: number, month: number, day: number): number {
  const seed = year * 10000 + month * 100 + day;
  const hash = ((seed * 2654435761) >>> 0) % 100;
  if (hash < 25) return 0;
  if (hash < 45) return 200 + (hash * 37) % 600;
  if (hash < 70) return 800 + (hash * 53) % 1200;
  return 1500 + (hash * 71) % 2000;
}

function intensityClass(words: number): string {
  if (words === 0) return 'bg-muted';
  if (words < 500) return 'bg-accent/20';
  if (words < 1000) return 'bg-accent/40';
  if (words < 1500) return 'bg-accent/60';
  return 'bg-accent/80';
}

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export function CalendarPage() {
  const { t } = useTranslation();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // getDay() returns 0=Sun, we want 0=Mon
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const cells: Array<{ day: number; words: number } | null> = [];

    // Leading empties
    for (let i = 0; i < startOffset; i++) cells.push(null);

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, words: mockWordCount(year, month + 1, d) });
    }

    // Trailing empties to fill last row
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [year, month]);

  const monthNames = [
    'dashboard.months.jan', 'dashboard.months.feb', 'dashboard.months.mar',
    'dashboard.months.apr', 'dashboard.months.may', 'dashboard.months.jun',
    'dashboard.months.jul', 'dashboard.months.aug', 'dashboard.months.sep',
    'dashboard.months.oct', 'dashboard.months.nov', 'dashboard.months.dec',
  ];

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const today = now.getDate();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <ScrollArea className="h-full">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <h1 className="text-xl font-semibold text-foreground">
          {t('calendar.title')}
        </h1>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={prevMonth}>
            <ChevronLeft size={16} strokeWidth={1.5} />
          </Button>
          <span className="text-sm font-medium text-foreground">
            {t(monthNames[month])} {year}
          </span>
          <Button variant="ghost" size="sm" onClick={nextMonth}>
            <ChevronRight size={16} strokeWidth={1.5} />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-card rounded-lg border border-border p-4">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAY_KEYS.map((key) => (
              <div key={key} className="text-center text-xs text-muted-foreground font-medium py-1">
                {t(`calendar.weekdays.${key}`)}
              </div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarGrid.map((cell, idx) => {
              if (!cell) {
                return <div key={idx} className="aspect-square" />;
              }

              const isToday = isCurrentMonth && cell.day === today;

              return (
                <div
                  key={idx}
                  className={cn(
                    'aspect-square rounded-md flex flex-col items-center justify-center gap-0.5',
                    'transition-colors duration-fast ease-out cursor-pointer',
                    'hover:ring-1 hover:ring-ring',
                    intensityClass(cell.words),
                    isToday && 'ring-2 ring-accent',
                  )}
                  title={`${cell.words} ${t('calendar.wordsWritten')}`}
                >
                  <span className={cn(
                    'text-xs font-medium',
                    isToday ? 'text-accent' : 'text-foreground',
                  )}>
                    {cell.day}
                  </span>
                  {cell.words > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {cell.words > 999 ? `${(cell.words / 1000).toFixed(1)}k` : cell.words}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
