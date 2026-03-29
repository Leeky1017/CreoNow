import { forwardRef, useMemo, useState, type HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, FileText, User, Settings, Zap } from 'lucide-react';
import { ScrollArea, Input, Badge } from '@/components/primitives';
import { cn } from '@/lib/cn';

type SearchCategory = 'document' | 'character' | 'setting' | 'action';

interface SearchResult {
  id: string;
  title: string;
  category: SearchCategory;
  snippet: string;
}

const MOCK_RESULTS: SearchResult[] = [
  { id: '1', title: 'Chapter 1: Prologue', category: 'document', snippet: 'The starlight flickered as Lin Xia stepped into the lab…' },
  { id: '2', title: 'Lin Xia', category: 'character', snippet: 'Protagonist, astrophysics PhD candidate' },
  { id: '3', title: 'Star Lab', category: 'setting', snippet: 'Primary location — underground research facility' },
  { id: '4', title: 'Chapter 3: Revelation', category: 'document', snippet: 'The dark matter signal appeared on screen…' },
  { id: '5', title: 'Export to Markdown', category: 'action', snippet: 'Export current document as .md file' },
  { id: '6', title: 'Wei Wuji', category: 'character', snippet: 'Antagonist, tech conglomerate CEO' },
];

const categoryIcons: Record<SearchCategory, typeof FileText> = {
  document: FileText,
  character: User,
  setting: Settings,
  action: Zap,
};

const categoryBadgeVariant: Record<SearchCategory, 'accent' | 'default' | 'outline'> = {
  document: 'default',
  character: 'accent',
  setting: 'outline',
  action: 'default',
};

export interface SearchFeatureProps extends HTMLAttributes<HTMLDivElement> {}

export const SearchFeature = forwardRef<HTMLDivElement, SearchFeatureProps>(
  ({ className, ...props }, ref) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<SearchCategory | null>(null);

    const categories: SearchCategory[] = ['document', 'character', 'setting', 'action'];

    const filtered = useMemo(() => {
      let results = MOCK_RESULTS;
      if (activeCategory) {
        results = results.filter((r) => r.category === activeCategory);
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        results = results.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.snippet.toLowerCase().includes(q),
        );
      }
      return results;
    }, [query, activeCategory]);

    const hasQuery = query.trim().length > 0;

    return (
      <div ref={ref} className={cn('flex flex-col h-full', className)} {...props}>
        {/* Search input */}
        <div className="px-4 py-3 border-b border-border space-y-3">
          <div className="relative">
            <Search
              size={14}
              strokeWidth={1.5}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              placeholder={t('search.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {/* Category filters */}
          <div className="flex items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs transition-colors duration-fast ease-out',
                  activeCategory === cat
                    ? 'bg-accent/20 text-accent'
                    : 'text-muted-foreground hover:bg-muted/50',
                )}
              >
                {t(`search.categories.${cat}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="flex-1">
          {!hasQuery && filtered.length === MOCK_RESULTS.length && !activeCategory ? (
            /* Hint state */
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Search size={32} strokeWidth={1.5} className="text-muted-foreground/40 mb-3" />
              <p className="text-sm">{t('search.hint')}</p>
            </div>
          ) : filtered.length === 0 ? (
            /* No results */
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Search size={32} strokeWidth={1.5} className="text-muted-foreground/40 mb-3" />
              <p className="text-sm">{t('search.noResults')}</p>
            </div>
          ) : (
            <ul className="py-1">
              {filtered.map((result) => {
                const Icon = categoryIcons[result.category];
                return (
                  <li
                    key={result.id}
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors duration-fast ease-out cursor-pointer"
                  >
                    <Icon
                      size={14}
                      strokeWidth={1.5}
                      className="text-muted-foreground shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {result.title}
                        </span>
                        <Badge variant={categoryBadgeVariant[result.category]}>
                          {t(`search.categories.${result.category}`)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {result.snippet}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </div>
    );
  },
);

SearchFeature.displayName = 'SearchFeature';
