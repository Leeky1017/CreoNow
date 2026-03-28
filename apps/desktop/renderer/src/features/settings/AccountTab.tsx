import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import { SettingsSection } from '@/components/composites/SettingsSection';

export function AccountTab() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title={t('settings.account.profile.title')}
        description={t('settings.account.profile.description')}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-subtle">
            <User className="h-5 w-5 text-accent" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              {t('settings.account.profile.guest')}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('settings.account.profile.localMode')}
            </span>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
