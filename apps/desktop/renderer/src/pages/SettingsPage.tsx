import { useTranslation } from 'react-i18next';

export function SettingsPage() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      {t('nav.settings')}
    </div>
  );
}
