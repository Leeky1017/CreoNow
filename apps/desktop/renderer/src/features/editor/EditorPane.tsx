import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { useEditorStore } from "../../stores/editorStore";
import { useAutosave } from "./useAutosave";
import { Text } from "../../components/primitives";

/**
 * EditorPane mounts TipTap editor and wires autosave to the DB SSOT.
 */
export function EditorPane(props: { projectId: string }): JSX.Element {
  const bootstrapStatus = useEditorStore((s) => s.bootstrapStatus);
  const documentId = useEditorStore((s) => s.documentId);
  const documentContentJson = useEditorStore((s) => s.documentContentJson);
  const save = useEditorStore((s) => s.save);
  const setEditorInstance = useEditorStore((s) => s.setEditorInstance);

  const suppressAutosaveRef = React.useRef<boolean>(false);
  const [contentReady, setContentReady] = React.useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    autofocus: true,
    editorProps: {
      attributes: {
        "data-testid": "tiptap-editor",
        class: "h-full outline-none p-4 text-[var(--color-fg-default)]",
      },
    },
    content: { type: "doc", content: [{ type: "paragraph" }] },
  });

  React.useEffect(() => {
    setEditorInstance(editor ?? null);
    return () => setEditorInstance(null);
  }, [editor, setEditorInstance]);

  React.useEffect(() => {
    if (!editor || !documentId || !documentContentJson) {
      setContentReady(false);
      return;
    }

    try {
      setContentReady(false);
      suppressAutosaveRef.current = true;
      editor.commands.setContent(JSON.parse(documentContentJson));
    } finally {
      window.setTimeout(() => {
        suppressAutosaveRef.current = false;
        setContentReady(true);
      }, 0);
    }
  }, [documentContentJson, documentId, editor]);

  useAutosave({
    enabled: bootstrapStatus === "ready" && !!documentId && contentReady,
    projectId: props.projectId,
    documentId: documentId ?? "",
    editor,
    suppressRef: suppressAutosaveRef,
  });

  React.useEffect(() => {
    if (
      !editor ||
      bootstrapStatus !== "ready" ||
      !documentId ||
      !contentReady
    ) {
      return;
    }

    const currentEditor = editor;
    const currentDocumentId = documentId;

    function onKeyDown(e: KeyboardEvent): void {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) {
        return;
      }

      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        const json = JSON.stringify(currentEditor.getJSON());
        void save({
          projectId: props.projectId,
          documentId: currentDocumentId,
          contentJson: json,
          actor: "user",
          reason: "manual-save",
        });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    bootstrapStatus,
    contentReady,
    documentId,
    editor,
    props.projectId,
    save,
  ]);

  if (bootstrapStatus !== "ready") {
    return (
      <Text as="div" size="body" color="muted" className="p-4">
        Loading editor…
      </Text>
    );
  }

  if (!documentId) {
    return (
      <Text as="div" size="body" color="muted" className="p-4">
        No document selected.
      </Text>
    );
  }

  if (!contentReady) {
    return (
      <Text as="div" size="body" color="muted" className="p-4">
        Loading document…
      </Text>
    );
  }

  return (
    <div
      data-testid="editor-pane"
      data-document-id={documentId}
      className="w-full h-full min-w-0"
    >
      <EditorContent editor={editor} />
    </div>
  );
}
