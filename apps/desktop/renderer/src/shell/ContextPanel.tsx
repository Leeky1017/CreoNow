import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { useLayoutStore } from '@/stores/ui/layoutStore';
import { FileTree } from '@/features/file-tree/FileTree';
import { OutlinePanel } from '@/components/composites/OutlinePanel';
import { ProjectSwitcher } from '@/components/composites/ProjectSwitcher';
import { ScrollArea } from '@/components/primitives';
import { cn } from '@/lib/cn';

const MOCK_OUTLINE = [
  { id: '1', level: 1 as const, text: '第一章：序幕' },
  { id: '2', level: 2 as const, text: '1.1 清晨' },
  { id: '3', level: 2 as const, text: '1.2 相遇' },
  { id: '4', level: 1 as const, text: '第二章：初遇' },
  { id: '5', level: 2 as const, text: '2.1 咖啡馆' },
  { id: '6', level: 3 as const, text: '2.1.1 对话' },
];

const MOCK_SEARCH_RESULTS = [
  '第一章：序幕',
  '第二章：初遇',
  '角色设定：林夏',
  '世界观笔记',
];

function InlineSearch() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return MOCK_SEARCH_RESULTS;
    const q = query.toLowerCase();
    return MOCK_SEARCH_RESULTS.filter((r) => r.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Search size={14} strokeWidth={1.5} className="text-muted-foreground shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>
      <ScrollArea className="flex-1">
        <ul className="py-1">
          {results.length === 0 ? (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">
              {t('search.noResults')}
            </li>
          ) : (
            results.map((item) => (
              <li
                key={item}
                className="px-3 py-1.5 text-sm text-foreground/80 hover:bg-hover-overlay cursor-pointer transition-colors duration-fast rounded-md mx-1"
              >
                {item}
              </li>
            ))
          )}
        </ul>
      </ScrollArea>
    </div>
  );
}

export function ContextPanel() {
  const { t } = useTranslation();
  const sidebarVisible = useLayoutStore((s) => s.sidebarVisible);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const activeLeftPanel = useLayoutStore((s) => s.activeLeftPanel);
  const leftPanelWidth = useLayoutStore((s) => s.leftPanelWidth);

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

  return (
    <div
      className={cn(
        'bg-sidebar border-r border-border overflow-hidden',
        'transition-all duration-slow ease-out',
        sidebarVisible ? '' : 'w-0',
      )}
      style={sidebarVisible ? { width: leftPanelWidth } : undefined}
    >
      <div className="h-full flex flex-col" style={{ width: leftPanelWidth }}>
        {/* ProjectSwitcher at top */}
        <div className="border-b border-border">
          <ProjectSwitcher />
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-hidden">
          {activeLeftPanel === 'files' && (
            <>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('shell.contextPanel.files')}
              </div>
              <FileTree />
            </>
          )}
          {activeLeftPanel === 'search' && <InlineSearch />}
          {activeLeftPanel === 'outline' && <OutlinePanel items={MOCK_OUTLINE} />}
        </div>
      </div>
    </div>
  );
}
