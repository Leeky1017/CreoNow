import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import { ScrollArea, Input, Badge, Button } from '@/components/primitives';
import { cn } from '@/lib/cn';

interface MockCharacter {
  id: string;
  name: string;
  description: string;
  role: 'protagonist' | 'supporting' | 'antagonist';
}

const MOCK_CHARACTERS: MockCharacter[] = [
  { id: '1', name: '林夏', description: '故事的主人公，一位年轻的考古学者，性格倔强但内心细腻。', role: 'protagonist' },
  { id: '2', name: '陈烨', description: '林夏的导师，学识渊博，隐藏着不为人知的秘密。', role: 'supporting' },
  { id: '3', name: '苏晴', description: '探险队的队医，乐观开朗，是团队的粘合剂。', role: 'supporting' },
  { id: '4', name: '魏无忌', description: '文物走私集团幕后主使，城府极深，行事不择手段。', role: 'antagonist' },
];

const roleBadgeVariant: Record<MockCharacter['role'], 'accent' | 'default' | 'destructive'> = {
  protagonist: 'accent',
  supporting: 'default',
  antagonist: 'destructive',
};

export function CharactersPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return MOCK_CHARACTERS;
    const q = query.toLowerCase();
    return MOCK_CHARACTERS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">
            {t('characters.title')}
          </h1>
          <Button size="sm" variant="default">
            <Plus size={14} strokeWidth={1.5} />
            {t('characters.addCharacter')}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            strokeWidth={1.5}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('characters.searchPlaceholder')}
            className="pl-9"
          />
        </div>

        {/* Character Cards */}
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            {t('characters.noResults')}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((char) => (
              <div
                key={char.id}
                className={cn(
                  'bg-card rounded-lg border border-border p-4',
                  'hover:border-muted-foreground/30 transition-colors duration-fast ease-out',
                  'cursor-pointer',
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-accent-subtle flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-accent">
                      {char.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {char.name}
                      </span>
                      <Badge variant={roleBadgeVariant[char.role]}>
                        {t(`characters.${char.role}`)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {char.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
