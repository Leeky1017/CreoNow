import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useLayoutStore } from '@/stores/ui/layoutStore';
import { FileTree } from '@/features/file-tree/FileTree';
import { cn } from '@/lib/cn';

export function ContextPanel() {
  const { t } = useTranslation();
  const location = useLocation();
  const sidebarVisible = useLayoutStore((s) => s.sidebarVisible);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);

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

  const isFilesRoute = location.pathname.startsWith('/app/files');

  return (
    <div
      className={cn(
        'bg-sidebar border-r border-border overflow-hidden',
        'transition-all duration-slow ease-out',
        sidebarVisible ? 'w-60' : 'w-0',
      )}
    >
      <div className="w-60 h-full flex flex-col">
        {isFilesRoute ? (
          <>
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('shell.contextPanel.files')}
            </div>
            <FileTree />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t('shell.contextPanel.outline')}
          </div>
        )}
      </div>
    </div>
  );
}
