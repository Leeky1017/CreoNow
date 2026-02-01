/**
 * CommandPalette is a minimal placeholder surface opened by Cmd/Ctrl+P.
 */
import React from "react";

import { Card } from "../../components/primitives/Card";
import { ListItem } from "../../components/primitives/ListItem";
import { Text } from "../../components/primitives/Text";
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
      <Card
        data-testid="command-palette"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        variant="raised"
        className="w-[520px] max-w-[90vw] flex flex-col gap-2.5 p-4 rounded-[var(--radius-lg)]"
      >
        <div className="flex items-baseline gap-2.5">
          <Text size="small" color="muted">
            Command Palette
          </Text>
          <Text size="tiny" color="subtle" className="ml-auto">
            Ctrl/Cmd+P
          </Text>
        </div>

        {errorText ? (
          <Text
            data-testid="command-palette-error"
            size="small"
            color="muted"
          >
            {errorText}
          </Text>
        ) : null}

        <ListItem
          data-testid="command-item-export-markdown"
          interactive
          compact
          onClick={() => void onExportMarkdown()}
          className="border border-[var(--color-border-default)] text-left"
        >
          Export Markdown
        </ListItem>
      </Card>
    </div>
  );
}
