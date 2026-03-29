import { useTranslation } from 'react-i18next';
import { Bot, Info, CheckCircle } from 'lucide-react';
import { useLayoutStore } from '@/stores/ui/layoutStore';
import { useDocumentStore } from '@/stores/business/documentStore';
import { ScrollArea } from '@/components/primitives';
import { AIPanel } from '@/features/ai-panel/AIPanel';
import { cn } from '@/lib/cn';
import type { LucideIcon } from 'lucide-react';

interface TabDef {
  id: 'ai' | 'info' | 'quality';
  icon: LucideIcon;
  labelKey: string;
}

const tabs: TabDef[] = [
  { id: 'ai', icon: Bot, labelKey: 'rightPanel.tabs.ai' },
  { id: 'info', icon: Info, labelKey: 'rightPanel.tabs.info' },
  { id: 'quality', icon: CheckCircle, labelKey: 'rightPanel.tabs.quality' },
];

function InfoTab() {
  const { t } = useTranslation();
  const activeDocId = useDocumentStore((s) => s.activeDocId);
  const currentContent = useDocumentStore((s) => s.currentContent);
  const unsavedChanges = useDocumentStore((s) => s.unsavedChanges);

  const wordCount = currentContent ? currentContent.length.toLocaleString() : '12,450';
  const paragraphCount = currentContent
    ? currentContent.split(/\n\s*\n/).filter(Boolean).length.toString()
    : '86';

  const fields = [
    { label: t('rightPanel.info.title'), value: activeDocId ? `doc-${activeDocId}` : '第一章：序幕' },
    { label: t('rightPanel.info.created'), value: '2026-03-15 14:30' },
    { label: t('rightPanel.info.modified'), value: unsavedChanges ? '(未保存)' : '2026-03-29 10:22' },
    { label: t('rightPanel.info.wordCount'), value: wordCount },
    { label: t('rightPanel.info.paragraphs'), value: paragraphCount },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3 px-3 py-3">
        {fields.map((field) => (
          <div key={field.label} className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{field.label}</span>
            <span className="text-sm text-foreground">{field.value}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function QualityTab() {
  const { t } = useTranslation();

  const checks = [
    { label: t('rightPanel.quality.readability'), score: 85, checked: true },
    { label: t('rightPanel.quality.precision'), score: 72, checked: false },
    { label: t('rightPanel.quality.structure'), score: 90, checked: true },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3 px-3 py-3">
        {checks.map((check) => (
          <label
            key={check.label}
            className="flex items-center justify-between gap-2 py-1.5 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                defaultChecked={check.checked}
                className="w-4 h-4 rounded-sm border border-border accent-accent"
              />
              <span className="text-sm text-foreground">{check.label}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {t('rightPanel.quality.score')}: {check.score}
            </span>
          </label>
        ))}
      </div>
    </ScrollArea>
  );
}

const panelContent: Record<'ai' | 'info' | 'quality', () => JSX.Element> = {
  ai: AIPanel,
  info: InfoTab,
  quality: QualityTab,
};

export function RightPanel() {
  const { t } = useTranslation();
  const activeRightPanel = useLayoutStore((s) => s.activeRightPanel);
  const setActiveRightPanel = useLayoutStore((s) => s.setActiveRightPanel);
  const rightPanelWidth = useLayoutStore((s) => s.rightPanelWidth);

  const ActiveContent = panelContent[activeRightPanel];

  return (
    <div
      className="flex flex-col h-full bg-sidebar border-l border-border overflow-hidden"
      style={{ width: rightPanelWidth }}
    >
      {/* Tabs */}
      <div className="flex items-center border-b border-border shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeRightPanel === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveRightPanel(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium',
                'transition-colors duration-fast ease-out',
                isActive
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon size={14} strokeWidth={1.5} />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ActiveContent />
      </div>
    </div>
  );
}
