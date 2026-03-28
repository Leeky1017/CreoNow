import { EditorContent, type Editor } from '@tiptap/react';
import { cn } from '@/lib/cn';

export interface EditorViewProps {
  editor: Editor | null;
  className?: string;
}

export function EditorView({ editor, className }: EditorViewProps) {
  return (
    <div
      className={cn(
        'flex-1 overflow-y-auto bg-background text-foreground',
        className,
      )}
    >
      <EditorContent
        editor={editor}
        className={cn(
          'px-20 py-8 max-w-3xl mx-auto',
          'min-h-full',
          'font-[var(--font-editor)] text-base leading-[1.8]',
          '[&_.tiptap]:outline-none',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:float-left',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:h-0',
        )}
      />
    </div>
  );
}
