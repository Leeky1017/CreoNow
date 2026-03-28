import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useTranslation } from 'react-i18next';
import { EditorView } from '@/features/editor/EditorView';
import { EditorToolbar } from '@/features/editor/EditorToolbar';
import { EditorErrorBoundary } from '@/features/editor/EditorErrorBoundary';

export function EditorPage() {
  const { t } = useTranslation();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: t('editor.placeholder'),
      }),
    ],
  });

  return (
    <EditorErrorBoundary>
      <div className="flex flex-col h-full">
        <EditorToolbar editor={editor} />
        <EditorView editor={editor} />
      </div>
    </EditorErrorBoundary>
  );
}
