import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Brain, Search } from 'lucide-react';
import { ScrollArea, Badge, Input } from '@/components/primitives';
import { cn } from '@/lib/cn';

type MemoryTag = 'character' | 'plot' | 'setting' | 'note';

interface MemoryEntry {
  id: string;
  tag: MemoryTag;
  content: string;
  timestamp: string;
}

export interface MemoryPanelProps {
  memories?: MemoryEntry[];
}

const TAG_VARIANTS: Record<MemoryTag, 'accent' | 'default' | 'destructive' | 'outline'> = {
  character: 'accent',
  plot: 'default',
  setting: 'outline',
  note: 'default',
};

const MOCK_MEMORIES: MemoryEntry[] = [
  { id: 'm1', tag: 'character', content: '林夏的父亲是退休宇航员，这一背景影响了她对太空的执念', timestamp: '2026-03-28 15:30' },
  { id: 'm2', tag: 'plot', content: '第三章需要在暗物质信号出现前增加一个假警报，制造悬念', timestamp: '2026-03-27 10:00' },
  { id: 'm3', tag: 'setting', content: '星辰实验室位于青海高原，海拔 4200 米，空气稀薄', timestamp: '2026-03-26 18:45' },
  { id: 'm4', tag: 'note', content: '参考刘慈欣《三体》中的红岸基地设定来构建实验室氛围', timestamp: '2026-03-25 09:20' },
  { id: 'm5', tag: 'character', content: '魏无忌的真实动机是为了拯救身患绝症的女儿，不能一开始就揭露', timestamp: '2026-03-24 14:15' },
];

export function MemoryPanel({ memories = MOCK_MEMORIES }: MemoryPanelProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter.trim()) return memories;
    const q = filter.toLowerCase();
    return memories.filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        t(`memory.tags.${m.tag}`).toLowerCase().includes(q),
    );
  }, [memories, filter, t]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <Brain size={14} strokeWidth={1.5} className="text-accent" />
        <h3 className="text-sm font-semibold text-foreground">{t('memory.title')}</h3>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="relative">
          <Search
            size={14}
            strokeWidth={1.5}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('memory.search')}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {t('memory.noMemories')}
          </div>
        ) : (
          <div className="flex flex-col gap-1 px-3 py-2">
            {filtered.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex flex-col gap-1.5 rounded-md px-3 py-2',
                  'hover:bg-hover-overlay transition-colors duration-fast',
                )}
              >
                <div className="flex items-center gap-2">
                  <Badge variant={TAG_VARIANTS[m.tag]} className="text-[10px]">
                    {t(`memory.tags.${m.tag}`)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto">{m.timestamp}</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{m.content}</p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
