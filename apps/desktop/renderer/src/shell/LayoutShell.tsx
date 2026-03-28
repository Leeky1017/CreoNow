import { Outlet } from 'react-router';

export function LayoutShell() {
  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      {/* Icon Rail — Round 1.4 实现 */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
