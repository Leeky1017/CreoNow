import { useTranslation } from 'react-i18next';
import { Pencil, FileText, Flame, FolderOpen, FileIcon, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/primitives';
import { KPICard } from '@/components/composites/KPICard';
import { HeatmapGrid } from '@/components/composites/HeatmapGrid';

/* Mock data — will be replaced by real IPC calls */
const MOCK_HEATMAP: number[][] = Array.from({ length: 52 }, (_, w) =>
  Array.from({ length: 7 }, (_, d) => {
    const seed = (w * 7 + d) * 2654435761;
    return ((seed >>> 0) % 5);
  }),
);

const MOCK_RECENT_DOCS = [
  { id: '1', name: '第一章：序幕', updatedAt: '2 小时前' },
  { id: '2', name: '角色设定：林夏', updatedAt: '5 小时前' },
  { id: '3', name: '世界观笔记', updatedAt: '昨天' },
  { id: '4', name: '第二章：初遇', updatedAt: '2 天前' },
];

const MOCK_AI_SUGGESTIONS = [
  '尝试为第一章增加环境描写，让读者更有沉浸感',
  '角色对话可以更自然，考虑加入口语化表达',
  '本周写作效率提升了 23%，继续保持！',
];

export function DashboardPage() {
  const { t } = useTranslation();

  const now = new Date();
  const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;

  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Greeting */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {t('dashboard.greeting')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{dateStr}</p>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard
            label={t('dashboard.todayWords')}
            value="2,340"
            trend={{ direction: 'up', percentage: 15 }}
            icon={<Pencil size={16} strokeWidth={1.5} />}
          />
          <KPICard
            label={t('dashboard.weekWords')}
            value="12,580"
            trend={{ direction: 'up', percentage: 23 }}
            icon={<FileText size={16} strokeWidth={1.5} />}
          />
          <KPICard
            label={t('dashboard.streak')}
            value={`7 ${t('dashboard.days')}`}
            trend={{ direction: 'flat', percentage: 0 }}
            icon={<Flame size={16} strokeWidth={1.5} />}
          />
          <KPICard
            label={t('dashboard.totalDocs')}
            value={`42 ${t('dashboard.docs')}`}
            icon={<FolderOpen size={16} strokeWidth={1.5} />}
          />
        </div>

        {/* Heatmap */}
        <section>
          <h2 className="text-sm font-medium text-foreground mb-3">
            {t('dashboard.heatmap')}
          </h2>
          <div className="bg-card rounded-lg border border-border p-4 overflow-x-auto">
            <HeatmapGrid data={MOCK_HEATMAP} />
          </div>
        </section>

        {/* Bottom: Recent + AI */}
        <div className="grid grid-cols-10 gap-4">
          {/* Recent Docs — 6 cols */}
          <section className="col-span-6 bg-card rounded-lg border border-border p-4">
            <h2 className="text-sm font-medium text-foreground mb-3">
              {t('dashboard.recentDocs')}
            </h2>
            <ul className="space-y-2">
              {MOCK_RECENT_DOCS.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors duration-fast ease-out cursor-pointer"
                >
                  <FileIcon size={14} strokeWidth={1.5} className="text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground truncate flex-1">{doc.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{doc.updatedAt}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* AI Suggestions — 4 cols */}
          <section className="col-span-4 bg-card rounded-lg border border-border p-4">
            <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-1.5">
              <Sparkles size={14} strokeWidth={1.5} className="text-accent" />
              {t('dashboard.aiSuggestions')}
            </h2>
            <ul className="space-y-2">
              {MOCK_AI_SUGGESTIONS.map((suggestion, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground leading-relaxed border-l-2 border-accent/30 pl-3 py-1"
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </ScrollArea>
  );
}
