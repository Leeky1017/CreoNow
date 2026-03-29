import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/primitives';
import { cn } from '@/lib/cn';

export interface OutlineItem {
  id: string;
  level: 1 | 2 | 3;
  text: string;
}

export interface OutlinePanelProps {
  items: OutlineItem[];
  onItemClick?: (id: string) => void;
  activeId?: string;
}

const levelIndent: Record<OutlineItem['level'], string> = {
  1: 'pl-0',
  2: 'pl-4',
  3: 'pl-8',
};

const levelText: Record<OutlineItem['level'], string> = {
  1: 'text-sm font-medium',
  2: 'text-sm',
  3: 'text-xs',
};

export function OutlinePanel({ items, onItemClick, activeId }: OutlinePanelProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 px-4">
        <p className="text-sm">{t('outline.empty')}</p>
        <p className="text-xs text-center">{t('outline.hint')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
        {t('outline.title')}
      </div>
      <ScrollArea className="flex-1">
        <ul className="py-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onItemClick?.(item.id)}
                className={cn(
                  'w-full text-left px-3 py-1.5 rounded-md',
                  'transition-colors duration-fast ease-out',
                  levelIndent[item.level],
                  levelText[item.level],
                  activeId === item.id
                    ? 'text-accent bg-accent-subtle'
                    : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
                )}
              >
                {item.text}
              </button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
