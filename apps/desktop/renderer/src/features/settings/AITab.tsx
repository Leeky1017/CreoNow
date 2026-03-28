import { useTranslation } from 'react-i18next';
import { Slider } from '@/components/primitives';
import { SettingsSection } from '@/components/composites/SettingsSection';
import { FormField } from '@/components/composites/FormField';
import { useSettingsStore } from '@/stores/ui/settingsStore';

export function AITab() {
  const { t } = useTranslation();
  const aiTemperature = useSettingsStore((s) => s.aiTemperature);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title={t('settings.ai.model.title')}
        description={t('settings.ai.model.description')}
      >
        <FormField label={t('settings.ai.model.selector')}>
          <select
            disabled
            className="h-9 w-full rounded-md border border-border bg-input-bg px-3 text-sm text-muted-foreground transition-colors duration-fast ease-out"
          >
            <option>{t('settings.ai.model.defaultModel')}</option>
          </select>
        </FormField>
      </SettingsSection>

      <SettingsSection title={t('settings.ai.parameters.title')}>
        <FormField
          label={t('settings.ai.parameters.temperature')}
          description={t('settings.ai.parameters.temperatureDescription', { value: aiTemperature.toFixed(1) })}
        >
          <Slider
            value={[aiTemperature * 100]}
            onValueChange={([v]) => updateSetting('aiTemperature', v / 100)}
            min={0}
            max={100}
            step={5}
          />
        </FormField>
      </SettingsSection>
    </div>
  );
}
