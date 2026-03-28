import { useTranslation } from 'react-i18next';
import { Slider, Switch } from '@/components/primitives';
import { SettingsSection } from '@/components/composites/SettingsSection';
import { FormField } from '@/components/composites/FormField';
import { useSettingsStore } from '@/stores/ui/settingsStore';

const FONT_FAMILIES = ['Source Serif 4', 'Inter', 'Georgia', 'JetBrains Mono'];

export function EditorTab() {
  const { t } = useTranslation();
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const lineHeight = useSettingsStore((s) => s.lineHeight);
  const autoSave = useSettingsStore((s) => s.autoSave);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title={t('settings.editor.font.title')}>
        <FormField label={t('settings.editor.font.family')}>
          <select
            value={fontFamily}
            onChange={(e) => updateSetting('fontFamily', e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-input-bg px-3 text-sm text-foreground transition-colors duration-fast ease-out focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label={t('settings.editor.font.size')}
          description={t('settings.editor.font.sizeDescription', { value: fontSize })}
        >
          <Slider
            value={[fontSize]}
            onValueChange={([v]) => updateSetting('fontSize', v)}
            min={12}
            max={32}
            step={1}
          />
        </FormField>

        <FormField
          label={t('settings.editor.font.lineHeight')}
          description={t('settings.editor.font.lineHeightDescription', { value: lineHeight.toFixed(1) })}
        >
          <Slider
            value={[lineHeight * 10]}
            onValueChange={([v]) => updateSetting('lineHeight', v / 10)}
            min={12}
            max={24}
            step={1}
          />
        </FormField>
      </SettingsSection>

      <SettingsSection title={t('settings.editor.behavior.title')}>
        <FormField label={t('settings.editor.behavior.autoSave')}>
          <Switch
            checked={autoSave}
            onCheckedChange={(v) => updateSetting('autoSave', v)}
          />
        </FormField>
      </SettingsSection>
    </div>
  );
}
