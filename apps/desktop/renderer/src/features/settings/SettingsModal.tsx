import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Palette, FileEdit, Bot, User, Keyboard } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button, Input, Switch, Slider, Separator } from '@/components/primitives';
import { SettingsSection } from '@/components/composites/SettingsSection';
import { FormField } from '@/components/composites/FormField';
import { useSettingsStore } from '@/stores/business/settingsStore';

type TabId = 'appearance' | 'editor' | 'ai' | 'account' | 'shortcuts';

const TAB_ICONS = {
  appearance: Palette,
  editor: FileEdit,
  ai: Bot,
  account: User,
  shortcuts: Keyboard,
} as const;

const TAB_ORDER: TabId[] = ['appearance', 'editor', 'ai', 'account', 'shortcuts'];

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('appearance');
  const settings = useSettingsStore();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleLanguageChange = (lang: 'zh-CN' | 'en-US') => {
    settings.setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={t('settings.title')}
    >
      <div className="w-[720px] max-h-[85vh] bg-modal rounded-xl border border-border shadow-(--shadow-xl) flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            {t('settings.title')}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('common.cancel')}>
            <X size={16} strokeWidth={1.5} />
          </Button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <nav className="w-48 border-r border-border py-2 shrink-0">
            {TAB_ORDER.map((tabId) => {
              const Icon = TAB_ICONS[tabId];
              const isActive = activeTab === tabId;
              return (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => setActiveTab(tabId)}
                  className={cn(
                    'flex items-center gap-2 w-full px-4 py-2 text-sm text-left',
                    'transition-colors duration-fast ease-out',
                    'border-l-2',
                    isActive
                      ? 'border-accent bg-accent-subtle text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <Icon size={16} strokeWidth={1.5} />
                  {t(`settings.tabs.${tabId}`)}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'appearance' && (
              <AppearanceTab
                language={settings.language}
                onLanguageChange={handleLanguageChange}
              />
            )}
            {activeTab === 'editor' && <EditorTab />}
            {activeTab === 'ai' && <AITab />}
            {activeTab === 'account' && <AccountTab />}
            {activeTab === 'shortcuts' && <ShortcutsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Tab Panels --- */

function AppearanceTab({
  language,
  onLanguageChange,
}: {
  language: 'zh-CN' | 'en-US';
  onLanguageChange: (lang: 'zh-CN' | 'en-US') => void;
}) {
  const { t } = useTranslation();
  return (
    <SettingsSection title={t('settings.tabs.appearance')}>
      <FormField label={t('settings.appearance.theme')}>
        <span className="text-sm text-muted-foreground">{t('settings.appearance.themeDark')}</span>
      </FormField>
      <Separator />
      <FormField label={t('settings.appearance.language')}>
        <div className="flex gap-1">
          <Button
            variant={language === 'zh-CN' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onLanguageChange('zh-CN')}
          >
            {t('settings.languages.zhCN')}
          </Button>
          <Button
            variant={language === 'en-US' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onLanguageChange('en-US')}
          >
            {t('settings.languages.enUS')}
          </Button>
        </div>
      </FormField>
    </SettingsSection>
  );
}

function EditorTab() {
  const { t } = useTranslation();
  const { fontSize, lineHeight, autoSave, setFontSize, setLineHeight, setAutoSave } =
    useSettingsStore();
  return (
    <SettingsSection title={t('settings.tabs.editor')}>
      <FormField label={`${t('settings.editor.fontSize')}: ${fontSize}px`}>
        <Slider
          className="w-40"
          min={12}
          max={24}
          step={1}
          value={[fontSize]}
          onValueChange={([v]) => setFontSize(v)}
        />
      </FormField>
      <Separator />
      <FormField label={`${t('settings.editor.lineHeight')}: ${lineHeight.toFixed(1)}`}>
        <Slider
          className="w-40"
          min={1.2}
          max={2.4}
          step={0.1}
          value={[lineHeight]}
          onValueChange={([v]) => setLineHeight(v)}
        />
      </FormField>
      <Separator />
      <FormField
        label={t('settings.editor.autoSave')}
        description={t('settings.editor.autoSaveDescription')}
      >
        <Switch checked={autoSave} onCheckedChange={setAutoSave} />
      </FormField>
    </SettingsSection>
  );
}

function AITab() {
  const { t } = useTranslation();
  const { aiProvider, aiModel, setAiProvider, setAiModel } = useSettingsStore();
  return (
    <SettingsSection title={t('settings.tabs.ai')}>
      <FormField label={t('settings.ai.provider')}>
        <Input
          className="w-48"
          value={aiProvider}
          onChange={(e) => setAiProvider(e.target.value)}
          placeholder="OpenAI"
        />
      </FormField>
      <Separator />
      <FormField label={t('settings.ai.model')}>
        <Input
          className="w-48"
          value={aiModel}
          onChange={(e) => setAiModel(e.target.value)}
          placeholder="gpt-4"
        />
      </FormField>
    </SettingsSection>
  );
}

function AccountTab() {
  const { t } = useTranslation();
  return (
    <SettingsSection title={t('settings.tabs.account')}>
      <p className="text-sm text-muted-foreground">{t('settings.account.comingSoon')}</p>
    </SettingsSection>
  );
}

const SHORTCUTS = [
  { actionKey: 'settings.shortcuts.save', shortcut: '⌘S' },
  { actionKey: 'settings.shortcuts.search', shortcut: '⌘K' },
  { actionKey: 'settings.shortcuts.toggleSidebar', shortcut: '⌘B' },
  { actionKey: 'settings.shortcuts.newFile', shortcut: '⌘N' },
  { actionKey: 'settings.shortcuts.settings', shortcut: '⌘,' },
] as const;

function ShortcutsTab() {
  const { t } = useTranslation();
  return (
    <SettingsSection title={t('settings.shortcuts.title')}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="pb-2 font-medium">{t('settings.shortcuts.action')}</th>
            <th className="pb-2 font-medium text-right">{t('settings.shortcuts.shortcut')}</th>
          </tr>
        </thead>
        <tbody>
          {SHORTCUTS.map(({ actionKey, shortcut }) => (
            <tr key={actionKey} className="border-b border-border/50">
              <td className="py-2 text-foreground">{t(actionKey)}</td>
              <td className="py-2 text-right">
                <kbd className="px-2 py-0.5 text-xs bg-muted rounded-sm text-muted-foreground font-mono">
                  {shortcut}
                </kbd>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SettingsSection>
  );
}
