import { useTranslation } from 'react-i18next';

export function KnowledgeGraphPage() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      {t('pages.knowledgeGraph')}
    </div>
  );
}
