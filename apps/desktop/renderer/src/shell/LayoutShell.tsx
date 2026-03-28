import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { IconRail } from './IconRail';
import { ContextPanel } from './ContextPanel';

export function LayoutShell() {
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        navigate('/settings');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      <IconRail />
      <ContextPanel />
      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
