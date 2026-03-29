import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { File, Folder, Plus, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { ScrollArea, Input, Button } from '@/components/primitives';
import { cn } from '@/lib/cn';

interface MockFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: string;
  modified: string;
  children?: MockFile[];
}

const MOCK_FILES: MockFile[] = [
  {
    id: 'f1',
    name: 'Novel Project',
    type: 'folder',
    modified: '2026-03-28',
    children: [
      { id: 'f1a', name: 'Chapter 1 — Prologue.md', type: 'file', size: '12 KB', modified: '2026-03-28' },
      { id: 'f1b', name: 'Chapter 2 — First Encounter.md', type: 'file', size: '8.4 KB', modified: '2026-03-27' },
    ],
  },
  {
    id: 'f2',
    name: 'Character Profiles',
    type: 'folder',
    modified: '2026-03-26',
    children: [
      { id: 'f2a', name: 'Lin Xia.md', type: 'file', size: '3.2 KB', modified: '2026-03-26' },
    ],
  },
  { id: 'f3', name: 'Worldbuilding Notes.md', type: 'file', size: '5.1 KB', modified: '2026-03-25' },
  { id: 'f4', name: 'Outline.md', type: 'file', size: '2.8 KB', modified: '2026-03-24' },
  { id: 'f5', name: 'Research References.md', type: 'file', size: '6.7 KB', modified: '2026-03-22' },
];

function FileRow({
  file,
  depth = 0,
}: {
  file: MockFile;
  depth?: number;
}) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <li
        className={cn(
          'flex items-center gap-2 px-4 py-2 hover:bg-muted/50',
          'transition-colors duration-fast ease-out cursor-pointer',
        )}
        style={{ paddingLeft: `${16 + depth * 16}px` }}
        onClick={() => file.type === 'folder' && setOpen(!open)}
      >
        {file.type === 'folder' ? (
          <>
            {open ? (
              <ChevronDown size={14} strokeWidth={1.5} className="text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight size={14} strokeWidth={1.5} className="text-muted-foreground shrink-0" />
            )}
            <Folder size={14} strokeWidth={1.5} className="text-accent shrink-0" />
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" />
            <File size={14} strokeWidth={1.5} className="text-muted-foreground shrink-0" />
          </>
        )}
        <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
        {file.size && (
          <span className="text-xs text-muted-foreground shrink-0">{file.size}</span>
        )}
        <span className="text-xs text-muted-foreground shrink-0">{file.modified}</span>
      </li>
      {file.type === 'folder' && open && file.children?.map((child) => (
        <FileRow key={child.id} file={child} depth={depth + 1} />
      ))}
    </>
  );
}

export function FilesPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? MOCK_FILES.filter((f) =>
        f.name.toLowerCase().includes(query.toLowerCase()) ||
        f.children?.some((c) => c.name.toLowerCase().includes(query.toLowerCase())),
      )
    : MOCK_FILES;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={14}
            strokeWidth={1.5}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder={t('files.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Plus size={14} strokeWidth={1.5} />
          {t('files.newFile')}
        </Button>
        <Button variant="outline" size="sm">
          <Folder size={14} strokeWidth={1.5} />
          {t('files.newFolder')}
        </Button>
      </div>

      {/* File list */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <File size={32} strokeWidth={1.5} className="text-muted-foreground/40 mb-3" />
            <p className="text-sm">{t('files.empty')}</p>
          </div>
        ) : (
          <ul className="py-1">
            {filtered.map((file) => (
              <FileRow key={file.id} file={file} />
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
