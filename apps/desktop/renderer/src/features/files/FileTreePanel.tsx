import React from "react";

import { useEditorStore } from "../../stores/editorStore";
import { useFileStore } from "../../stores/fileStore";

type EditingState =
  | { mode: "idle" }
  | { mode: "rename"; documentId: string; title: string };

/**
 * FileTreePanel renders the project-scoped documents list (DB SSOT) and actions.
 *
 * Why: P0-015 requires a minimal documents loop with stable selectors for Windows E2E.
 */
export function FileTreePanel(props: { projectId: string }): JSX.Element {
  const items = useFileStore((s) => s.items);
  const currentDocumentId = useFileStore((s) => s.currentDocumentId);
  const bootstrapStatus = useFileStore((s) => s.bootstrapStatus);
  const lastError = useFileStore((s) => s.lastError);

  const createAndSetCurrent = useFileStore((s) => s.createAndSetCurrent);
  const rename = useFileStore((s) => s.rename);
  const deleteDocument = useFileStore((s) => s.delete);
  const setCurrent = useFileStore((s) => s.setCurrent);
  const clearError = useFileStore((s) => s.clearError);

  const openDocument = useEditorStore((s) => s.openDocument);
  const openCurrentForProject = useEditorStore(
    (s) => s.openCurrentDocumentForProject,
  );

  const [editing, setEditing] = React.useState<EditingState>({ mode: "idle" });
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (editing.mode !== "rename") {
      return;
    }

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing.mode]);

  async function onCreate(): Promise<void> {
    const res = await createAndSetCurrent({ projectId: props.projectId });
    if (!res.ok) {
      return;
    }
    await openDocument({
      projectId: props.projectId,
      documentId: res.data.documentId,
    });
  }

  async function onSelect(documentId: string): Promise<void> {
    const setPromise = setCurrent({ projectId: props.projectId, documentId });
    await openDocument({ projectId: props.projectId, documentId });
    await setPromise;
  }

  async function onCommitRename(): Promise<void> {
    if (editing.mode !== "rename") {
      return;
    }

    const res = await rename({
      projectId: props.projectId,
      documentId: editing.documentId,
      title: editing.title,
    });
    if (!res.ok) {
      return;
    }
    setEditing({ mode: "idle" });
  }

  async function onDelete(documentId: string): Promise<void> {
    const ok = window.confirm("Delete this document?");
    if (!ok) {
      return;
    }

    const res = await deleteDocument({ projectId: props.projectId, documentId });
    if (!res.ok) {
      return;
    }

    await openCurrentForProject(props.projectId);
  }

  return (
    <div
      data-testid="sidebar-files"
      style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-3)",
          borderBottom: "1px solid var(--color-separator)",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
          Files
        </div>
        <button
          type="button"
          data-testid="file-create"
          onClick={() => void onCreate()}
          style={{
            fontSize: 12,
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-default)",
            background: "var(--color-bg-surface)",
            color: "var(--color-fg-default)",
            cursor: "pointer",
          }}
        >
          New
        </button>
      </div>

      {lastError ? (
        <div
          role="alert"
          style={{
            padding: "var(--space-3)",
            fontSize: 12,
            color: "var(--color-fg-default)",
            borderBottom: "1px solid var(--color-separator)",
          }}
        >
          <div style={{ marginBottom: "var(--space-2)" }}>
            {lastError.code}: {lastError.message}
          </div>
          <button
            type="button"
            onClick={() => clearError()}
            style={{
              fontSize: 12,
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-default)",
              background: "var(--color-bg-surface)",
              color: "var(--color-fg-default)",
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        {bootstrapStatus !== "ready" ? (
          <div
            style={{
              padding: "var(--space-3)",
              fontSize: 12,
              color: "var(--color-fg-muted)",
            }}
          >
            Loading files…
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              padding: "var(--space-3)",
              fontSize: 12,
              color: "var(--color-fg-muted)",
            }}
          >
            No documents yet.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-1)",
            }}
          >
            {items.map((item) => {
              const selected = item.documentId === currentDocumentId;
              const isRenaming =
                editing.mode === "rename" &&
                editing.documentId === item.documentId;
              return (
                <div
                  key={item.documentId}
                  data-testid={`file-row-${item.documentId}`}
                  aria-selected={selected}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "var(--space-2) var(--space-3)",
                    margin: `0 var(--space-2)`,
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${
                      selected
                        ? "var(--color-border-focus)"
                        : "var(--color-border-default)"
                    }`,
                    background: selected
                      ? "var(--color-bg-selected)"
                      : "transparent",
                    cursor: isRenaming ? "default" : "pointer",
                  }}
                  onClick={() => {
                    if (isRenaming) {
                      return;
                    }
                    void onSelect(item.documentId);
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isRenaming ? (
                      <input
                        ref={inputRef}
                        data-testid={`file-rename-input-${item.documentId}`}
                        value={editing.title}
                        onChange={(e) =>
                          setEditing({
                            mode: "rename",
                            documentId: item.documentId,
                            title: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setEditing({ mode: "idle" });
                            return;
                          }
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void onCommitRename();
                          }
                        }}
                        style={{
                          width: "100%",
                          fontSize: 12,
                          padding: "var(--space-1) var(--space-2)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--color-border-default)",
                          background: "var(--color-bg-base)",
                          color: "var(--color-fg-default)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-fg-default)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.title}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "var(--space-1)" }}>
                      {isRenaming ? (
                        <>
                          <button
                            type="button"
                            data-testid={`file-rename-confirm-${item.documentId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              void onCommitRename();
                            }}
                            style={{
                              fontSize: 12,
                              padding: "var(--space-1) var(--space-2)",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--color-border-default)",
                              background: "var(--color-bg-surface)",
                              color: "var(--color-fg-default)",
                              cursor: "pointer",
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing({ mode: "idle" });
                            }}
                            style={{
                              fontSize: 12,
                              padding: "var(--space-1) var(--space-2)",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--color-border-default)",
                              background: "var(--color-bg-surface)",
                              color: "var(--color-fg-default)",
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            data-testid={`file-rename-${item.documentId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing({
                                mode: "rename",
                                documentId: item.documentId,
                                title: item.title,
                              });
                            }}
                            style={{
                              fontSize: 12,
                              padding: "var(--space-1) var(--space-2)",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--color-border-default)",
                              background: "var(--color-bg-surface)",
                              color: "var(--color-fg-default)",
                              cursor: "pointer",
                            }}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            data-testid={`file-delete-${item.documentId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              void onDelete(item.documentId);
                            }}
                            style={{
                              fontSize: 12,
                              padding: "var(--space-1) var(--space-2)",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--color-border-default)",
                              background: "var(--color-bg-surface)",
                              color: "var(--color-fg-default)",
                              cursor: "pointer",
                            }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
