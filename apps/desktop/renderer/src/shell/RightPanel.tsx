import { useTranslation } from 'react-i18next';
import { Bot, Info, CheckCircle, Send } from 'lucide-react';
import { useLayoutStore } from '@/stores/ui/layoutStore';
import { ScrollArea } from '@/components/primitives';
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

function AITab() {
  const { t } = useTranslation();

  const mockMessages = [
    { role: 'user' as const, text: '帮我改写这段描写' },
    { role: 'assistant' as const, text: '这段描写可以更加生动，试试增加感官细节...' },
  ];

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="flex flex-col gap-3">
          {mockMessages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                'rounded-lg px-3 py-2 text-sm',
                msg.role === 'user'
                  ? 'bg-accent-subtle text-foreground ml-6'
                  : 'bg-muted text-foreground mr-6',
              )}
            >
              {msg.text}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
        <input
          type="text"
          placeholder={t('rightPanel.ai.placeholder')}
          className="flex-1 h-8 px-3 rounded-md bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-accent transition-colors duration-fast"
        />
        <button
          type="button"
          aria-label={t('rightPanel.ai.send')}
          className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-accent hover:bg-hover-overlay transition-colors duration-fast"
        >
          <Send size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

function InfoTab() {
  const { t } = useTranslation();

  const fields = [
    { label: t('rightPanel.info.title'), value: '第一章：序幕' },
    { label: t('rightPanel.info.created'), value: '2026-03-15 14:30' },
    { label: t('rightPanel.info.modified'), value: '2026-03-29 10:22' },
    { label: t('rightPanel.info.wordCount'), value: '12,450' },
    { label: t('rightPanel.info.paragraphs'), value: '86' },
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
  ai: AITab,
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
