import { createHashRouter, Navigate } from 'react-router';
import { LayoutShell } from './shell/LayoutShell';
import { DashboardPage } from './pages/DashboardPage';
import { FilesPage } from './pages/FilesPage';
import { EditorPage } from './pages/EditorPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CharactersPage } from './pages/CharactersPage';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage';
import { CalendarPage } from './pages/CalendarPage';
import { SettingsPage } from './pages/SettingsPage';

export const router = createHashRouter([
  {
    path: '/',
    element: <LayoutShell />,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'app/dashboard', element: <DashboardPage /> },
      { path: 'app/files', element: <FilesPage /> },
      { path: 'app/editor/:docId?', element: <EditorPage /> },
      { path: 'app/analytics', element: <AnalyticsPage /> },
      { path: 'app/characters', element: <CharactersPage /> },
      { path: 'app/knowledge-graph', element: <KnowledgeGraphPage /> },
      { path: 'app/calendar', element: <CalendarPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
