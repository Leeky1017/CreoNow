import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PenLine, BarChart3, FolderOpen, Flame, FileText, Sparkles } from 'lucide-react';
import { TooltipProvider } from '@/components/primitives';
import { KPICard } from '@/components/composites/KPICard';
import { HeatmapGrid } from '@/components/composites/HeatmapGrid';

function getGreetingKey(hour: number): string {
  if (hour < 6) return 'dashboard.greeting.night';
  if (hour < 12) return 'dashboard.greeting.morning';
  if (hour < 18) return 'dashboard.greeting.afternoon';
  return 'dashboard.greeting.evening';
}

function generateMockHeatmapData(): Array<{ date: string; count: number }> {
  const data: Array<{ date: string; count: number }> = [];
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const rand = Math.random();
    let count = 0;
    if (rand > 0.3) count = Math.floor(Math.random() * 500);
    if (rand > 0.7) count = Math.floor(Math.random() * 2000) + 500;
    if (rand > 0.9) count = Math.floor(Math.random() * 3000) + 2000;
    data.push({ date: dateStr, count });
  }
  return data;
}

const MOCK_RECENT_DOCS = [
  { id: '1', title: 'Chapter 12: The Storm', updatedAt: '2 hours ago', words: 3200 },
  { id: '2', title: 'Character Notes — Aria', updatedAt: '5 hours ago', words: 1800 },
  { id: '3', title: 'World Building Guide', updatedAt: 'Yesterday', words: 5400 },
  { id: '4', title: 'Plot Outline v3', updatedAt: '2 days ago', words: 2100 },
];

const MOCK_SUGGESTIONS = [
  { id: '1', text: 'dashboard.suggestions.continueLast' },
  { id: '2', text: 'dashboard.suggestions.reviewCharacter' },
  { id: '3', text: 'dashboard.suggestions.expandOutline' },
];

export function DashboardPage() {
  const { t } = useTranslation();
  const heatmapData = useMemo(() => generateMockHeatmapData(), []);
  const now = new Date();
  const greetingKey = getGreetingKey(now.getHours());

  return (
    <TooltipProvider>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl flex flex-col gap-6">
          {/* Greeting */}
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-foreground">{t(greetingKey)}</h1>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.date', {
                date: now.toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }),
              })}
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-3">
            <KPICard
              label={t('dashboard.kpi.todayWords')}
              value="1,280"
              icon={PenLine}
              trend={{ value: 12, direction: 'up' }}
            />
            <KPICard
              label={t('dashboard.kpi.weeklyWords')}
              value="8,450"
              icon={BarChart3}
              trend={{ value: 8, direction: 'up' }}
            />
            <KPICard
              label={t('dashboard.kpi.activeProjects')}
              value={3}
              icon={FolderOpen}
            />
            <KPICard
              label={t('dashboard.kpi.writingStreak')}
              value={14}
              icon={Flame}
              trend={{ value: 5, direction: 'down' }}
            />
          </div>

          {/* Heatmap */}
          <div className="rounded-lg border border-border bg-card p-4">
            <HeatmapGrid data={heatmapData} />
          </div>

          {/* Bottom section: 6:4 split */}
          <div className="grid grid-cols-10 gap-4">
            {/* Recent docs — 6 columns */}
            <div className="col-span-6 rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-medium text-foreground mb-3">
                {t('dashboard.recentDocs.title')}
              </h2>
              <div className="flex flex-col gap-1">
                {MOCK_RECENT_DOCS.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-hover-subtle transition-colors duration-fast ease-out cursor-pointer"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.updatedAt} · {t('dashboard.recentDocs.words', { count: doc.words })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Suggestions — 4 columns */}
            <div className="col-span-4 rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-medium text-foreground mb-3">
                {t('dashboard.suggestions.title')}
              </h2>
              <div className="flex flex-col gap-2">
                {MOCK_SUGGESTIONS.map((s) => (
                  <button
                    key={s.id}
                    className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-left text-sm text-muted-foreground hover:text-foreground hover:bg-hover-subtle transition-colors duration-fast ease-out"
                  >
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    <span>{t(s.text)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
