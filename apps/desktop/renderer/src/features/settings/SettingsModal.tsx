import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Palette,
  Type,
  Sparkles,
  User,
  Keyboard,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { AppearanceTab } from './AppearanceTab';
import { EditorTab } from './EditorTab';
import { AITab } from './AITab';
import { AccountTab } from './AccountTab';
import { ShortcutsTab } from './ShortcutsTab';

type SettingsTabId = 'appearance' | 'editor' | 'ai' | 'account' | 'shortcuts';

interface TabDef {
  id: SettingsTabId;
  labelKey: string;
  icon: typeof Palette;
}

const TABS: TabDef[] = [
  { id: 'appearance', labelKey: 'settings.tabs.appearance', icon: Palette },
  { id: 'editor', labelKey: 'settings.tabs.editor', icon: Type },
  { id: 'ai', labelKey: 'settings.tabs.ai', icon: Sparkles },
  { id: 'account', labelKey: 'settings.tabs.account', icon: User },
  { id: 'shortcuts', labelKey: 'settings.tabs.shortcuts', icon: Keyboard },
];

const TAB_CONTENT: Record<SettingsTabId, React.FC> = {
  appearance: AppearanceTab,
  editor: EditorTab,
  ai: AITab,
  account: AccountTab,
  shortcuts: ShortcutsTab,
};

export function SettingsModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTabId>('appearance');

  const handleClose = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const ActiveTabContent = TAB_CONTENT[activeTab];

  return (
    <Dialog.Root open onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-modal-overlay backdrop-blur-sm animate-overlay-show" />
        <Dialog.Content
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center',
            'animate-content-show',
          )}
          onEscapeKeyDown={handleClose}
        >
          <div
            className="absolute inset-0"
            onClick={handleClose}
            role="presentation"
          />
          <div
            className={cn(
              'relative flex w-full max-w-[720px] overflow-hidden',
              'rounded-lg border border-border bg-card shadow-xl',
              'max-h-[85vh]',
            )}
          >
            {/* Sidebar */}
            <div className="flex w-[180px] shrink-0 flex-col border-r border-border bg-sidebar py-4">
              <Dialog.Title className="px-4 pb-3 text-sm font-medium text-foreground">
                {t('settings.title')}
              </Dialog.Title>
              <nav className="flex flex-col gap-0.5 px-2">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                        'transition-colors duration-fast ease-out',
                        isActive
                          ? 'bg-accent-subtle text-accent border-l-2 border-accent -ml-px'
                          : 'text-muted-foreground hover:text-foreground hover:bg-hover-subtle',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {t(tab.labelKey)}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <ActiveTabContent />
            </div>

            {/* Close button */}
            <Dialog.Close asChild>
              <button
                onClick={handleClose}
                className={cn(
                  'absolute right-3 top-3 rounded-md p-1',
                  'text-muted-foreground hover:text-foreground',
                  'transition-colors duration-fast ease-out',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                )}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">{t('common.cancel')}</span>
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
