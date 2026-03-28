import { createHashRouter } from 'react-router';
import { useTranslation } from 'react-i18next';
import { LayoutShell } from './shell/LayoutShell';

function PlaceholderPage({ nameKey }: { nameKey: string }) {
  const { t } = useTranslation();
  return <div className="flex items-center justify-center h-full text-muted-foreground">{t(nameKey)}</div>;
}

export const router = createHashRouter([
  {
    path: '/',
    element: <LayoutShell />,
    children: [
      { index: true, element: <PlaceholderPage nameKey="nav.dashboard" /> },
      { path: 'editor', element: <PlaceholderPage nameKey="nav.editor" /> },
      { path: 'files', element: <PlaceholderPage nameKey="nav.files" /> },
      { path: 'analytics', element: <PlaceholderPage nameKey="nav.analytics" /> },
      { path: 'kg', element: <PlaceholderPage nameKey="nav.knowledgeGraph" /> },
      { path: 'characters', element: <PlaceholderPage nameKey="nav.characters" /> },
      { path: 'calendar', element: <PlaceholderPage nameKey="nav.calendar" /> },
      { path: 'settings', element: <PlaceholderPage nameKey="nav.settings" /> },
    ],
  },
]);
