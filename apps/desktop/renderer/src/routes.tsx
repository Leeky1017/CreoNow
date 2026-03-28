import { createBrowserRouter } from 'react-router';
import { LayoutShell } from './shell/LayoutShell';

function PlaceholderPage({ name }: { name: string }) {
  return <div className="flex items-center justify-center h-full text-muted-foreground">{name}</div>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LayoutShell />,
    children: [
      { index: true, element: <PlaceholderPage name="Dashboard" /> },
      { path: 'editor', element: <PlaceholderPage name="Editor" /> },
      { path: 'files', element: <PlaceholderPage name="Files" /> },
      { path: 'analytics', element: <PlaceholderPage name="Analytics" /> },
      { path: 'kg', element: <PlaceholderPage name="Knowledge Graph" /> },
      { path: 'characters', element: <PlaceholderPage name="Characters" /> },
      { path: 'calendar', element: <PlaceholderPage name="Calendar" /> },
      { path: 'settings', element: <PlaceholderPage name="Settings" /> },
    ],
  },
]);
