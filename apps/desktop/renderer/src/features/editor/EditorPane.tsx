import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";

import { useEditorStore } from "../../stores/editorStore";
import { useVersionStore } from "../../stores/versionStore";
import { useAutosave } from "./useAutosave";
import { Button, Text } from "../../components/primitives";
import { EditorToolbar } from "./EditorToolbar";
import {
  EditorBubbleMenu,
  EDITOR_INLINE_BUBBLE_MENU_PLUGIN_KEY,
} from "./EditorBubbleMenu";
import { resolveFinalDocumentEditDecision } from "./finalDocumentEditGuard";

const IS_VITEST_RUNTIME =
  typeof process !== "undefined" && Boolean(process.env.VITEST);

const ALLOWED_PASTE_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "code",
  "pre",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
]);

const UNWRAP_TAGS = new Set([
  "span",
  "font",
  "section",
  "article",
  "main",
  "header",
  "footer",
]);

const DROP_TAGS = new Set([
  "script",
  "style",
  "object",
  "embed",
  "iframe",
  "svg",
  "math",
]);

/**
 * Remove unsupported paste formatting and keep editor-supported structure.
 *
 * Why: paste from external editors often contains style blobs and embeds that
 * TipTap P0 does not support; this keeps output deterministic and safe.
 */
export function sanitizePastedHtml(inputHtml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(inputHtml, "text/html");
  const { body } = doc;

  const sanitizeElement = (element: HTMLElement): void => {
    const children = Array.from(element.childNodes);
    for (const child of children) {
      if (child.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }

      const childElement = child as HTMLElement;
      const tag = childElement.tagName.toLowerCase();

      if (DROP_TAGS.has(tag)) {
        childElement.remove();
        continue;
      }

      if (tag === "div") {
        const paragraph = doc.createElement("p");
        while (childElement.firstChild) {
          paragraph.appendChild(childElement.firstChild);
        }
        childElement.replaceWith(paragraph);
        sanitizeElement(paragraph);
        continue;
      }

      if (UNWRAP_TAGS.has(tag) || !ALLOWED_PASTE_TAGS.has(tag)) {
        while (childElement.firstChild) {
          element.insertBefore(childElement.firstChild, childElement);
        }
        childElement.remove();
        continue;
      }

      for (const attr of Array.from(childElement.attributes)) {
        childElement.removeAttribute(attr.name);
      }

      sanitizeElement(childElement);
    }
  };

  sanitizeElement(body);

  for (const child of Array.from(body.childNodes)) {
    if (child.nodeType !== Node.TEXT_NODE) {
      continue;
    }
    const value = child.textContent ?? "";
    if (value.trim().length === 0) {
      child.remove();
      continue;
    }
    const paragraph = doc.createElement("p");
    paragraph.textContent = value;
    child.replaceWith(paragraph);
  }

  return body.innerHTML;
}

/**
 * EditorPane mounts TipTap editor and wires autosave to the DB SSOT.
 */
export function EditorPane(props: { projectId: string }): JSX.Element {
  const bootstrapStatus = useEditorStore((s) => s.bootstrapStatus);
  const documentId = useEditorStore((s) => s.documentId);
  const documentStatus = useEditorStore((s) => s.documentStatus);
  const documentContentJson = useEditorStore((s) => s.documentContentJson);
  const save = useEditorStore((s) => s.save);
  const downgradeFinalStatusForEdit = useEditorStore(
    (s) => s.downgradeFinalStatusForEdit,
  );
  const setEditorInstance = useEditorStore((s) => s.setEditorInstance);
  const previewStatus = useVersionStore((s) => s.previewStatus);
  const previewTimestamp = useVersionStore((s) => s.previewTimestamp);
  const previewContentJson = useVersionStore((s) => s.previewContentJson);
  const exitPreview = useVersionStore((s) => s.exitPreview);

  const suppressAutosaveRef = React.useRef<boolean>(false);
  const [contentReady, setContentReady] = React.useState(false);
  const isPreviewMode =
    previewStatus === "ready" && previewContentJson !== null;
  const activeContentJson = isPreviewMode
    ? previewContentJson
    : documentContentJson;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: false,
      }),
      ...(!IS_VITEST_RUNTIME
        ? [
            BubbleMenuExtension.configure({
              pluginKey: EDITOR_INLINE_BUBBLE_MENU_PLUGIN_KEY,
            }),
          ]
        : []),
    ],
    autofocus: true,
    editorProps: {
      transformPastedHTML: sanitizePastedHtml,
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
    if (!editor) {
      return;
    }
    editor.setEditable(documentStatus !== "final" && !isPreviewMode);
  }, [documentStatus, editor, isPreviewMode]);

  React.useEffect(() => {
    if (!editor || !documentId || !activeContentJson) {
      setContentReady(false);
      return;
    }

    try {
      setContentReady(false);
      suppressAutosaveRef.current = true;
      editor.commands.setContent(JSON.parse(activeContentJson));
    } finally {
      window.setTimeout(() => {
        suppressAutosaveRef.current = false;
        setContentReady(true);
      }, 0);
    }
  }, [activeContentJson, documentId, editor]);

  useAutosave({
    enabled:
      bootstrapStatus === "ready" &&
      !!documentId &&
      contentReady &&
      documentStatus !== "final" &&
      !isPreviewMode,
    projectId: props.projectId,
    documentId: documentId ?? "",
    editor,
    suppressRef: suppressAutosaveRef,
  });

  async function requestEditFromFinal(): Promise<void> {
    if (!documentId || documentStatus !== "final") {
      return;
    }
    const confirmed = window.confirm(
      "This document is final. Editing will switch it back to draft. Continue?",
    );
    const decision = resolveFinalDocumentEditDecision({
      status: documentStatus,
      confirmed,
    });
    if (!decision.allowEditing) {
      return;
    }
    await downgradeFinalStatusForEdit({
      projectId: props.projectId,
      documentId,
    });
  }

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
        if (isPreviewMode) {
          e.preventDefault();
          return;
        }

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
    isPreviewMode,
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
      className="flex h-full w-full min-w-0 flex-col"
    >
      {isPreviewMode ? (
        <div
          data-testid="editor-preview-banner"
          className="flex items-center justify-between gap-3 border-b border-[var(--color-border-default)] bg-[var(--color-bg-raised)] px-4 py-2"
        >
          <Text size="small" color="muted">
            正在预览 {previewTimestamp ?? "历史"} 的版本
          </Text>
          <div className="flex items-center gap-2">
            <Button
              data-testid="preview-restore-placeholder"
              variant="secondary"
              size="sm"
              disabled={true}
              title="将在 version-control-p2 中接入完整恢复流程"
            >
              恢复到此版本
            </Button>
            <Button
              data-testid="preview-return-current"
              variant="secondary"
              size="sm"
              onClick={exitPreview}
            >
              返回当前版本
            </Button>
          </div>
        </div>
      ) : null}

      {documentStatus === "final" && !isPreviewMode ? (
        <div
          data-testid="final-document-guard"
          className="flex items-center justify-between gap-3 border-b border-[var(--color-separator)] bg-[var(--color-bg-surface)] px-4 py-2"
        >
          <Text size="small" color="muted">
            This document is final. Confirm before editing.
          </Text>
          <Button
            data-testid="final-document-edit-trigger"
            variant="secondary"
            size="sm"
            onClick={() => void requestEditFromFinal()}
          >
            Edit Anyway
          </Button>
        </div>
      ) : null}
      <EditorBubbleMenu editor={editor} />
      <EditorToolbar editor={editor} disabled={isPreviewMode} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
