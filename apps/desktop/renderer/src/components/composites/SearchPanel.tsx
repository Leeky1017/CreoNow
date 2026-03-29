import { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, FileText, User, Settings, Command, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ResultCategory = 'document' | 'character' | 'setting' | 'action';

interface SearchResult {
  id: string;
  title: string;
  category: ResultCategory;
}

export interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
  placeholder?: string;
}

const MOCK_RESULTS: SearchResult[] = [
  { id: '1', title: '第一章：序幕', category: 'document' },
  { id: '2', title: '角色设定：林夏', category: 'document' },
  { id: '3', title: '林夏', category: 'character' },
  { id: '4', title: '陈烨', category: 'character' },
  { id: '5', title: '外观设置', category: 'setting' },
  { id: '6', title: '新建文件', category: 'action' },
];

const categoryIcons: Record<ResultCategory, typeof FileText> = {
  document: FileText,
  character: User,
  setting: Settings,
  action: Command,
};

export function SearchPanel({ open, onClose, placeholder }: SearchPanelProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => {
    if (!query.trim()) return MOCK_RESULTS;
    const q = query.toLowerCase();
    return MOCK_RESULTS.filter((r) => r.title.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Defer focus to after render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, results.length]);

  // Reset active index when results change
  useEffect(() => { setActiveIndex(0); }, [results]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={t('nav.search')}
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
            placeholder={placeholder ?? t('search.placeholder')}
            className="flex-1 h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors duration-fast"
            aria-label={t('common.cancel')}
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t('search.noResults')}
            </div>
          ) : (
            <ul role="listbox">
              {results.map((result, idx) => {
                const Icon = categoryIcons[result.category];
                return (
                  <li
                    key={result.id}
                    role="option"
                    aria-selected={idx === activeIndex}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2 cursor-pointer',
                      'transition-colors duration-fast ease-out',
                      idx === activeIndex
                        ? 'bg-accent-subtle text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                  >
                    <Icon size={14} strokeWidth={1.5} className="shrink-0" />
                    <span className="text-sm flex-1 truncate">{result.title}</span>
                    <span className="text-xs opacity-60">
                      {t(`search.categories.${result.category}`)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer Hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground">
          <span>{t('search.hint')}</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">ESC</kbd>
        </div>
      </div>
    </div>
  );
}
