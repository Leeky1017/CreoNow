import { Outlet } from 'react-router';
import { IconRail } from './IconRail';
import { ContextPanel } from './ContextPanel';

export function LayoutShell() {
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
