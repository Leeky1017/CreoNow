/**
 * CommandPalette is a minimal placeholder surface opened by Cmd/Ctrl+P.
 */
import React from "react";

import { invoke } from "../../lib/ipcClient";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";

export function CommandPalette(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element | null {
  const currentProjectId = useProjectStore((s) => s.current?.projectId ?? null);
  const documentId = useEditorStore((s) => s.documentId);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  if (!props.open) {
    return null;
  }

  async function onExportMarkdown(): Promise<void> {
    setErrorText(null);
    if (!currentProjectId) {
      setErrorText("No current project");
      return;
    }

    const res = await invoke("export:markdown", {
      projectId: currentProjectId,
      documentId: documentId ?? undefined,
    });
    if (!res.ok) {
      setErrorText(`${res.error.code}: ${res.error.message}`);
      return;
    }

    props.onOpenChange(false);
  }

  return (
    <div className="cn-overlay" onClick={() => props.onOpenChange(false)}>
      <div
        data-testid="command-palette"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: "90vw",
          background: "var(--color-bg-raised)",
          border: "1px solid var(--color-border-default)",
          borderRadius: "var(--radius-lg)",
          padding: 16,
          color: "var(--color-fg-default)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
            Command Palette
          </div>
          <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--color-fg-subtle)" }}>
            Ctrl/Cmd+P
          </div>
        </div>

        {errorText ? (
          <div
            data-testid="command-palette-error"
            style={{ fontSize: 12, color: "var(--color-fg-muted)" }}
          >
            {errorText}
          </div>
        ) : null}

        <button
          data-testid="command-item-export-markdown"
          type="button"
          onClick={() => void onExportMarkdown()}
          style={{
            height: 32,
            padding: "0 var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-default)",
            background: "var(--color-bg-surface)",
            color: "var(--color-fg-default)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          Export Markdown
        </button>
      </div>
    </div>
  );
}
