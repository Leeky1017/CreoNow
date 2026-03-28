import { File } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface FileNodeProps {
  name: string;
  selected?: boolean;
  onClick?: () => void;
}

export function FileNode({ name, selected = false, onClick }: FileNodeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full h-8 px-2 text-sm text-left',
        'transition-colors duration-fast ease-out',
        'hover:bg-[rgba(255,255,255,0.04)]',
        selected && 'bg-accent-subtle border-l-2 border-accent',
        !selected && 'border-l-2 border-transparent',
      )}
    >
      <File size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
      <span className="truncate text-foreground">{name}</span>
    </button>
  );
}
