import { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  FilePlus,
  FolderOpen,
  Sun,
  Download,
  Settings,
  PanelRight,
  Minimize2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type CommandCategory = 'commands' | 'documents' | 'settings' | 'actions';

interface CommandItem {
  id: string;
  titleKey: string;
  category: CommandCategory;
  icon: LucideIcon;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onExecute?: (commandId: string) => void;
}

const COMMANDS: CommandItem[] = [
  { id: 'newDocument', titleKey: 'commandPalette.commands.newDocument', category: 'commands', icon: FilePlus },
  { id: 'openFile', titleKey: 'commandPalette.commands.openFile', category: 'commands', icon: FolderOpen },
  { id: 'toggleTheme', titleKey: 'commandPalette.commands.toggleTheme', category: 'settings', icon: Sun },
  { id: 'export', titleKey: 'commandPalette.commands.export', category: 'actions', icon: Download },
  { id: 'openSettings', titleKey: 'commandPalette.commands.openSettings', category: 'settings', icon: Settings },
  { id: 'toggleRightPanel', titleKey: 'commandPalette.commands.toggleRightPanel', category: 'actions', icon: PanelRight },
  { id: 'toggleZenMode', titleKey: 'commandPalette.commands.toggleZenMode', category: 'actions', icon: Minimize2 },
];

export function CommandPalette({ open, onClose, onExecute }: CommandPaletteProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const q = query.toLowerCase();
    return COMMANDS.filter((cmd) => t(cmd.titleKey).toLowerCase().includes(q));
  }, [query, t]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        onExecute?.(results[activeIndex].id);
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, onExecute, results, activeIndex]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  if (!open) return null;

  // Group results by category
  const grouped = results.reduce<Record<CommandCategory, CommandItem[]>>(
    (acc, item) => {
      acc[item.category].push(item);
      return acc;
    },
    { commands: [], documents: [], settings: [], actions: [] },
  );

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t('commandPalette.placeholder')}
    >
      <div className="w-[560px] bg-modal rounded-xl border border-border shadow-(--shadow-xl) overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-2 px-4 border-b border-border">
          <Search size={16} strokeWidth={1.5} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('commandPalette.placeholder')}
            className="flex-1 h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t('search.noResults')}
            </div>
          ) : (
            <ul role="listbox">
              {(Object.entries(grouped) as [CommandCategory, CommandItem[]][]).map(
                ([category, items]) => {
                  if (items.length === 0) return null;
                  return (
                    <li key={category}>
                      <div className="px-4 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        {t(`commandPalette.categories.${category}`)}
                      </div>
                      <ul>
                        {items.map((cmd) => {
                          flatIndex++;
                          const idx = flatIndex;
                          const Icon = cmd.icon;
                          return (
                            <li
                              key={cmd.id}
                              role="option"
                              aria-selected={idx === activeIndex}
                              onClick={() => {
                                onExecute?.(cmd.id);
                                onClose();
                              }}
                              className={cn(
                                'flex items-center gap-3 px-4 py-2 cursor-pointer',
                                'transition-colors duration-fast ease-out',
                                idx === activeIndex
                                  ? 'bg-accent-subtle text-foreground'
                                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                              )}
                            >
                              <Icon size={14} strokeWidth={1.5} className="shrink-0" />
                              <span className="text-sm flex-1 truncate">{t(cmd.titleKey)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                },
              )}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground">
          <span>↑↓ {t('nav.search')}</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">ESC</kbd>
        </div>
      </div>
    </div>
  );
}
