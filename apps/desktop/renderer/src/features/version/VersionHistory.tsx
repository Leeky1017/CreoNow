import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, RotateCcw } from 'lucide-react';
import { ScrollArea, Button, Badge } from '@/components/primitives';
import { cn } from '@/lib/cn';

interface VersionEntry {
  id: string;
  version: string;
  timestamp: string;
  summary: string;
}

export interface VersionHistoryProps {
  versions?: VersionEntry[];
  onRestore?: (versionId: string) => void;
}

const MOCK_VERSIONS: VersionEntry[] = [
  { id: 'v5', version: 'v1.5', timestamp: '2026-03-29 10:22', summary: '修改第三段环境描写，增加听觉细节' },
  { id: 'v4', version: 'v1.4', timestamp: '2026-03-28 18:45', summary: '调整对话节奏，优化角色语气' },
  { id: 'v3', version: 'v1.3', timestamp: '2026-03-27 14:30', summary: '新增第二幕转场段落' },
  { id: 'v2', version: 'v1.2', timestamp: '2026-03-26 09:15', summary: '修正时间线逻辑错误' },
  { id: 'v1', version: 'v1.1', timestamp: '2026-03-25 20:00', summary: '初稿完成' },
];

export function VersionHistory({ versions = MOCK_VERSIONS, onRestore }: VersionHistoryProps) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <History size={24} strokeWidth={1.5} className="text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{t('version.noVersions')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <History size={14} strokeWidth={1.5} className="text-accent" />
        <h3 className="text-sm font-semibold text-foreground">{t('version.title')}</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col px-4 py-2">
          {versions.map((v, idx) => {
            const isLatest = idx === 0;
            const isSelected = selectedId === v.id;
            return (
              <div key={v.id} className="flex gap-3">
                {/* Timeline line */}
                <div className="flex flex-col items-center w-3 shrink-0">
                  <div
                    className={cn(
                      'w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 transition-colors duration-fast',
                      isSelected ? 'bg-accent' : isLatest ? 'bg-accent/60' : 'bg-muted-foreground/30',
                    )}
                  />
                  {idx < versions.length - 1 && (
                    <div className="flex-1 w-px bg-border" />
                  )}
                </div>
                {/* Content */}
                <button
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  className={cn(
                    'flex-1 flex flex-col gap-1 text-left rounded-md px-3 py-2 mb-1',
                    'transition-colors duration-fast',
                    isSelected
                      ? 'bg-accent-subtle'
                      : 'hover:bg-hover-overlay',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {t('version.version')} {v.version}
                    </span>
                    {isLatest && (
                      <Badge variant="accent" className="text-[10px]">
                        {t('version.current')}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{v.timestamp}</span>
                  <span className="text-xs text-muted-foreground leading-relaxed">{v.summary}</span>
                  {isSelected && !isLatest && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-start mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestore?.(v.id);
                      }}
                    >
                      <RotateCcw size={12} strokeWidth={1.5} />
                      {t('version.restore')}
                    </Button>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
