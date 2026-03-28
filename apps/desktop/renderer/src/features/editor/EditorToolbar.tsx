import { useTranslation } from 'react-i18next';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  type LucideIcon,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { Toggle } from '@/components/primitives';
import { cn } from '@/lib/cn';

export interface EditorToolbarProps {
  editor: Editor | null;
  className?: string;
}

interface ToolbarAction {
  key: string;
  icon: LucideIcon;
  labelKey: string;
  isActive: (e: Editor) => boolean;
  run: (e: Editor) => void;
}

const actions: ToolbarAction[] = [
  {
    key: 'bold',
    icon: Bold,
    labelKey: 'editor.toolbar.bold',
    isActive: (e) => e.isActive('bold'),
    run: (e) => { e.chain().focus().toggleBold().run(); },
  },
  {
    key: 'italic',
    icon: Italic,
    labelKey: 'editor.toolbar.italic',
    isActive: (e) => e.isActive('italic'),
    run: (e) => { e.chain().focus().toggleItalic().run(); },
  },
  {
    key: 'h1',
    icon: Heading1,
    labelKey: 'editor.toolbar.heading1',
    isActive: (e) => e.isActive('heading', { level: 1 }),
    run: (e) => { e.chain().focus().toggleHeading({ level: 1 }).run(); },
  },
  {
    key: 'h2',
    icon: Heading2,
    labelKey: 'editor.toolbar.heading2',
    isActive: (e) => e.isActive('heading', { level: 2 }),
    run: (e) => { e.chain().focus().toggleHeading({ level: 2 }).run(); },
  },
  {
    key: 'bulletList',
    icon: List,
    labelKey: 'editor.toolbar.bulletList',
    isActive: (e) => e.isActive('bulletList'),
    run: (e) => { e.chain().focus().toggleBulletList().run(); },
  },
  {
    key: 'orderedList',
    icon: ListOrdered,
    labelKey: 'editor.toolbar.orderedList',
    isActive: (e) => e.isActive('orderedList'),
    run: (e) => { e.chain().focus().toggleOrderedList().run(); },
  },
];

export function EditorToolbar({ editor, className }: EditorToolbarProps) {
  const { t } = useTranslation();

  if (!editor) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-4 py-1.5',
        'border-b border-border bg-card',
        className,
      )}
      role="toolbar"
      aria-label={t('nav.editor')}
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Toggle
            key={action.key}
            pressed={action.isActive(editor)}
            onPressedChange={() => action.run(editor)}
            aria-label={t(action.labelKey)}
            className="h-8 w-8 p-0"
          >
            <Icon size={16} strokeWidth={1.5} />
          </Toggle>
        );
      })}
    </div>
  );
}
