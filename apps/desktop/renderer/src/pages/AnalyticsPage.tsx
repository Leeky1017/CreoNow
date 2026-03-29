import { useTranslation } from 'react-i18next';
import { FileText, PenLine, Flame, CalendarDays } from 'lucide-react';
import { ScrollArea } from '@/components/primitives';
import { KPICard } from '@/components/composites/KPICard';

const MOCK_TREND_DATA = [
  { day: 'mon', value: 1200 },
  { day: 'tue', value: 1800 },
  { day: 'wed', value: 800 },
  { day: 'thu', value: 2400 },
  { day: 'fri', value: 1600 },
  { day: 'sat', value: 3200 },
  { day: 'sun', value: 2000 },
];

const MOCK_HABITS = [
  { day: 'mon', sessions: 3 },
  { day: 'tue', sessions: 5 },
  { day: 'wed', sessions: 2 },
  { day: 'thu', sessions: 6 },
  { day: 'fri', sessions: 4 },
  { day: 'sat', sessions: 8 },
  { day: 'sun', sessions: 7 },
];

const MAX_TREND = Math.max(...MOCK_TREND_DATA.map((d) => d.value));
const MAX_HABITS = Math.max(...MOCK_HABITS.map((d) => d.sessions));

export function AnalyticsPage() {
  const { t } = useTranslation();

  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <h1 className="text-xl font-semibold text-foreground">
          {t('analytics.title')}
        </h1>

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard
            label={t('analytics.totalWords')}
            value="128,340"
            trend={{ direction: 'up', percentage: 12 }}
            icon={<PenLine size={16} strokeWidth={1.5} />}
          />
          <KPICard
            label={t('analytics.totalDocs')}
            value={`42 ${t('analytics.docs')}`}
            trend={{ direction: 'up', percentage: 5 }}
            icon={<FileText size={16} strokeWidth={1.5} />}
          />
          <KPICard
            label={t('analytics.avgDaily')}
            value={`1,830 ${t('analytics.words')}`}
            trend={{ direction: 'up', percentage: 18 }}
            icon={<CalendarDays size={16} strokeWidth={1.5} />}
          />
          <KPICard
            label={t('analytics.longestStreak')}
            value={`14 ${t('analytics.days')}`}
            trend={{ direction: 'flat', percentage: 0 }}
            icon={<Flame size={16} strokeWidth={1.5} />}
          />
        </div>

        {/* Writing Trend */}
        <section className="bg-card rounded-lg border border-border p-5">
          <h2 className="text-sm font-medium text-foreground mb-1">
            {t('analytics.trend')}
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            {t('analytics.thisWeek')}
          </p>
          <div className="flex items-end gap-3 h-40">
            {MOCK_TREND_DATA.map((item) => {
              const height = (item.value / MAX_TREND) * 100;
              return (
                <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {item.value.toLocaleString()}
                  </span>
                  <div className="w-full flex justify-center">
                    <div
                      className="w-8 rounded-t-md bg-accent/70 hover:bg-accent transition-colors duration-fast ease-out"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t(`analytics.weekdays.${item.day}`)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Writing Habits */}
        <section className="bg-card rounded-lg border border-border p-5">
          <h2 className="text-sm font-medium text-foreground mb-4">
            {t('analytics.weeklyHabits')}
          </h2>
          <div className="space-y-3">
            {MOCK_HABITS.map((item) => {
              const width = (item.sessions / MAX_HABITS) * 100;
              return (
                <div key={item.day} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {t(`analytics.weekdays.${item.day}`)}
                  </span>
                  <div className="flex-1 h-5 bg-muted rounded-md overflow-hidden">
                    <div
                      className="h-full bg-accent/60 rounded-md transition-all duration-normal ease-out"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-16">
                    {item.sessions} {t('analytics.words')}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
