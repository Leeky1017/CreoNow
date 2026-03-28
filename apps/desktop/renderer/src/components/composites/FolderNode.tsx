import { useState, type ReactNode } from 'react';
import { ChevronRight, Folder } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface FolderNodeProps {
  name: string;
  selected?: boolean;
  defaultOpen?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}

export function FolderNode({
  name,
  selected = false,
  defaultOpen = false,
  onClick,
  children,
}: FolderNodeProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          onClick?.();
        }}
        className={cn(
          'flex items-center gap-1 w-full h-8 px-2 text-sm text-left',
          'transition-colors duration-fast ease-out',
          'hover:bg-hover-subtle',
          selected && 'bg-accent-subtle border-l-2 border-accent',
          !selected && 'border-l-2 border-transparent',
        )}
      >
        <ChevronRight
          size={14}
          strokeWidth={1.5}
          className={cn(
            'shrink-0 text-muted-foreground transition-transform duration-fast ease-out',
            open && 'rotate-90',
          )}
        />
        <Folder size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
        <span className={cn('truncate', selected ? 'text-foreground' : 'text-muted-foreground')}>{name}</span>
      </button>
      {open && <div className="pl-3">{children}</div>}
    </div>
  );
}
