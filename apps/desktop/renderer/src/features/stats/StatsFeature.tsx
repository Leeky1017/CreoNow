import { forwardRef, type HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, TrendingUp, PenTool } from 'lucide-react';
import { ScrollArea } from '@/components/primitives';
import { cn } from '@/lib/cn';

const MOCK_STATS = {
  today: 1_240,
  week: 8_720,
  month: 34_500,
  total: 128_340,
  avgSession: 620,
};

const MOCK_WEEK_DATA = [
  { day: 'mon', value: 1200 },
  { day: 'tue', value: 1800 },
  { day: 'wed', value: 800 },
  { day: 'thu', value: 2400 },
  { day: 'fri', value: 1600 },
  { day: 'sat', value: 3200 },
  { day: 'sun', value: 2000 },
];

const MAX_VALUE = Math.max(...MOCK_WEEK_DATA.map((d) => d.value));

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-2">
        <span className="text-2xl font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}

export interface StatsFeatureProps extends HTMLAttributes<HTMLDivElement> {}

export const StatsFeature = forwardRef<HTMLDivElement, StatsFeatureProps>(
  ({ className, ...props }, ref) => {
    const { t } = useTranslation();

    return (
      <div ref={ref} className={cn('h-full', className)} {...props}>
        <ScrollArea className="h-full">
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-2">
              <BarChart3 size={20} strokeWidth={1.5} className="text-foreground" />
              <h1 className="text-xl font-semibold text-foreground">
                {t('stats.title')}
              </h1>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                label={t('stats.todayWords')}
                value={MOCK_STATS.today.toLocaleString()}
                icon={<PenTool size={16} strokeWidth={1.5} />}
              />
              <StatCard
                label={t('stats.weekWords')}
                value={MOCK_STATS.week.toLocaleString()}
                icon={<TrendingUp size={16} strokeWidth={1.5} />}
              />
              <StatCard
                label={t('stats.monthWords')}
                value={MOCK_STATS.month.toLocaleString()}
                icon={<BarChart3 size={16} strokeWidth={1.5} />}
              />
              <StatCard
                label={t('stats.totalWords')}
                value={MOCK_STATS.total.toLocaleString()}
                icon={<BarChart3 size={16} strokeWidth={1.5} />}
              />
            </div>

            {/* 7-day bar chart */}
            <section className="bg-card rounded-lg border border-border p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-medium text-foreground">
                  {t('stats.trend')}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {t('stats.avgSession')}: {MOCK_STATS.avgSession.toLocaleString()}
                </span>
              </div>
              <div className="flex items-end gap-3 h-40 mt-4">
                {MOCK_WEEK_DATA.map((item) => {
                  const height = (item.value / MAX_VALUE) * 100;
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
          </div>
        </ScrollArea>
      </div>
    );
  },
);

StatsFeature.displayName = 'StatsFeature';
