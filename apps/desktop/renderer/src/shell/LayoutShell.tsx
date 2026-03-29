import { useCallback } from 'react';
import { Outlet } from 'react-router';
import { IconRail } from './IconRail';
import { ContextPanel } from './ContextPanel';
import { StatusBar } from './StatusBar';
import { RightPanel } from './RightPanel';
import { DragResizeHandle } from '@/components/composites/DragResizeHandle';
import { useLayoutStore } from '@/stores/ui/layoutStore';

export function LayoutShell() {
  const rightPanelVisible = useLayoutStore((s) => s.rightPanelVisible);
  const statusBarVisible = useLayoutStore((s) => s.statusBarVisible);
  const setLeftPanelWidth = useLayoutStore((s) => s.setLeftPanelWidth);
  const leftPanelWidth = useLayoutStore((s) => s.leftPanelWidth);
  const setRightPanelWidth = useLayoutStore((s) => s.setRightPanelWidth);
  const rightPanelWidth = useLayoutStore((s) => s.rightPanelWidth);

  const handleLeftResize = useCallback(
    (delta: number) => {
      setLeftPanelWidth(Math.max(160, Math.min(480, leftPanelWidth + delta)));
    },
    [leftPanelWidth, setLeftPanelWidth],
  );

  const handleRightResize = useCallback(
    (delta: number) => {
      setRightPanelWidth(Math.max(240, Math.min(560, rightPanelWidth + delta)));
    },
    [rightPanelWidth, setRightPanelWidth],
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        <IconRail />
        <ContextPanel />
        <DragResizeHandle direction="left" onResize={handleLeftResize} />
        <main className="flex-1 overflow-hidden flex flex-col">
          <Outlet />
        </main>
        {rightPanelVisible && (
          <>
            <DragResizeHandle direction="right" onResize={handleRightResize} />
            <RightPanel />
          </>
        )}
      </div>
      {statusBarVisible && <StatusBar />}
    </div>
  );
}
