import { useTranslation } from 'react-i18next';
import { Slider } from '@/components/primitives';
import { SettingsSection } from '@/components/composites/SettingsSection';
import { FormField } from '@/components/composites/FormField';
import { useSettingsStore } from '@/stores/ui/settingsStore';
import { useThemeStore } from '@/stores/ui/themeStore';
import { cn } from '@/lib/cn';

const THEME_OPTIONS = ['dark', 'light', 'system'] as const;

export function AppearanceTab() {
  const { t } = useTranslation();
  const fontSize = useSettingsStore((s) => s.fontSize);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const currentTheme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title={t('settings.appearance.theme.title')}
        description={t('settings.appearance.theme.description')}
      >
        <div className="flex gap-2">
          {THEME_OPTIONS.map((theme) => (
            <button
              key={theme}
              onClick={() => setTheme(theme)}
              className={cn(
                'flex-1 rounded-md border px-3 py-2 text-sm transition-colors duration-fast ease-out',
                'border-border hover:bg-hover-overlay',
                currentTheme === theme && 'bg-accent-subtle border-accent text-accent',
              )}
            >
              {t(`settings.appearance.theme.${theme}`)}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title={t('settings.appearance.fontSize.title')}>
        <FormField
          label={t('settings.appearance.fontSize.label')}
          description={t('settings.appearance.fontSize.description', { value: fontSize })}
        >
          <Slider
            value={[fontSize]}
            onValueChange={([v]) => updateSetting('fontSize', v)}
            min={12}
            max={24}
            step={1}
          />
        </FormField>
      </SettingsSection>
    </div>
  );
}
