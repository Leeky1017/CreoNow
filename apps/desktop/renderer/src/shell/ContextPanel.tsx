import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useLayoutStore } from '@/stores/ui/layoutStore';
import { FileTree } from '@/features/file-tree/FileTree';
import { cn } from '@/lib/cn';

const MIN_WIDTH = 180;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 240;

export function ContextPanel() {
  const { t } = useTranslation();
  const location = useLocation();
  const sidebarVisible = useLayoutStore((s) => s.sidebarVisible);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const panelWidths = useLayoutStore((s) => s.panelWidths);
  const setPanelWidth = useLayoutStore((s) => s.setPanelWidth);

  const width = panelWidths['context'] ?? DEFAULT_WIDTH;
  const resizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(width);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizing.current = true;
      startX.current = e.clientX;
      startWidth.current = width;

      function onMouseMove(ev: MouseEvent) {
        if (!resizing.current) return;
        const delta = ev.clientX - startX.current;
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
        setPanelWidth('context', newWidth);
      }

      function onMouseUp() {
        resizing.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [width, setPanelWidth],
  );

  const isFilesRoute = location.pathname.startsWith('/app/files');
  const isEditorRoute = location.pathname.startsWith('/app/editor');
  const isDashboardRoute = location.pathname.startsWith('/app/dashboard');

  return (
    <div
      className={cn(
        'bg-sidebar border-r border-border overflow-hidden relative',
        'transition-all duration-slow ease-out',
        sidebarVisible ? '' : 'w-0',
      )}
      style={sidebarVisible ? { width } : undefined}
    >
      <div className="h-full flex flex-col" style={{ width }}>
        {isFilesRoute ? (
          <>
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('shell.contextPanel.files')}
            </div>
            <FileTree />
          </>
        ) : isEditorRoute ? (
          <div className="flex flex-col h-full">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('shell.contextPanel.outline')}
            </div>
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
              {t('shell.contextPanel.outlinePlaceholder')}
            </div>
          </div>
        ) : isDashboardRoute ? (
          <div className="flex flex-col h-full">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('shell.contextPanel.quickStats')}
            </div>
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
              {t('shell.contextPanel.quickStatsPlaceholder')}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t('shell.contextPanel.outline')}
          </div>
        )}
      </div>

      {/* Resize handle */}
      {sidebarVisible && (
        <div
          className={cn(
            'absolute top-0 right-0 w-1 h-full cursor-col-resize',
            'hover:bg-accent/30 active:bg-accent/50',
            'transition-colors duration-fast ease-out',
          )}
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-label={t('shell.contextPanel.resize')}
        />
      )}
    </div>
  );
}
