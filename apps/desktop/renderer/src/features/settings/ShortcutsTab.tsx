import { useTranslation } from 'react-i18next';
import { SettingsSection } from '@/components/composites/SettingsSection';

interface ShortcutEntry {
  key: string;
  label: string;
}

const SHORTCUTS: ShortcutEntry[] = [
  { key: 'Ctrl+B', label: 'shortcuts.toggleSidebar' },
  { key: 'Ctrl+,', label: 'shortcuts.openSettings' },
  { key: 'Ctrl+S', label: 'shortcuts.save' },
  { key: 'Ctrl+Z', label: 'shortcuts.undo' },
  { key: 'Ctrl+Shift+Z', label: 'shortcuts.redo' },
  { key: 'Ctrl+N', label: 'shortcuts.newFile' },
];

export function ShortcutsTab() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title={t('settings.shortcuts.title')}>
        <div className="flex flex-col gap-1">
          {SHORTCUTS.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-hover-subtle transition-colors duration-fast ease-out"
            >
              <span className="text-foreground">{t(`settings.${s.label}`)}</span>
              <kbd className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}
