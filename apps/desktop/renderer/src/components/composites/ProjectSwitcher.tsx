import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/cn';

const MOCK_PROJECTS = [
  { id: '1', name: '我的小说' },
  { id: '2', name: '散文集' },
  { id: '3', name: '诗歌选集' },
];

export interface ProjectSwitcherProps {
  className?: string;
}

export function ProjectSwitcher({ className }: ProjectSwitcherProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(MOCK_PROJECTS[0].id);
  const ref = useRef<HTMLDivElement>(null);

  const selected = MOCK_PROJECTS.find((p) => p.id === selectedId) ?? MOCK_PROJECTS[0];

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('projectSwitcher.label')}
        aria-expanded={open}
        className={cn(
          'flex items-center justify-between w-full gap-2 px-3 py-2',
          'text-sm text-foreground',
          'hover:bg-hover-overlay rounded-md',
          'transition-colors duration-fast ease-out',
        )}
      >
        <span className="truncate font-medium">{selected.name}</span>
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className={cn(
            'text-muted-foreground shrink-0 transition-transform duration-fast',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-popover border border-border rounded-lg shadow-(--shadow-md) overflow-hidden">
          <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium">
            {t('projectSwitcher.currentProject')}
          </div>
          {MOCK_PROJECTS.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => {
                setSelectedId(project.id);
                setOpen(false);
              }}
              className={cn(
                'flex items-center justify-between w-full px-3 py-2 text-sm',
                'transition-colors duration-fast ease-out',
                project.id === selectedId
                  ? 'text-accent bg-accent-subtle'
                  : 'text-foreground hover:bg-hover-overlay',
              )}
            >
              <span className="truncate">{project.name}</span>
              {project.id === selectedId && (
                <Check size={14} strokeWidth={1.5} className="shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
