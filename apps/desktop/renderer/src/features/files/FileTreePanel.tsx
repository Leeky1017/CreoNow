import React from "react";

import { Button, Input, ListItem, Text } from "../../components/primitives";
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
      className="flex flex-col min-h-0"
    >
      <div className="flex items-center justify-between p-3 border-b border-[var(--color-separator)]">
        <Text size="small" color="muted">Files</Text>
        <Button
          data-testid="file-create"
          variant="secondary"
          size="sm"
          onClick={() => void onCreate()}
        >
          New
        </Button>
      </div>

      {lastError ? (
        <div
          role="alert"
          className="p-3 border-b border-[var(--color-separator)]"
        >
          <Text size="small" className="mb-2 block">
            {lastError.code}: {lastError.message}
          </Text>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => clearError()}
          >
            Dismiss
          </Button>
        </div>
      ) : null}

      <div className="flex-1 overflow-auto min-h-0">
        {bootstrapStatus !== "ready" ? (
          <Text size="small" color="muted" className="p-3 block">
            Loading files…
          </Text>
        ) : items.length === 0 ? (
          <Text size="small" color="muted" className="p-3 block">
            No documents yet.
          </Text>
        ) : (
          <div className="flex flex-col gap-1 p-2">
            {items.map((item) => {
              const selected = item.documentId === currentDocumentId;
              const isRenaming =
                editing.mode === "rename" &&
                editing.documentId === item.documentId;
              return (
                <ListItem
                  key={item.documentId}
                  data-testid={`file-row-${item.documentId}`}
                  aria-selected={selected}
                  selected={selected}
                  interactive={!isRenaming}
                  compact
                  onClick={() => {
                    if (isRenaming) {
                      return;
                    }
                    void onSelect(item.documentId);
                  }}
                  className={`border ${selected ? "border-[var(--color-border-focus)]" : "border-[var(--color-border-default)]"}`}
                >
                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <Input
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
                        fullWidth
                        className="h-7 text-xs"
                      />
                    ) : (
                      <Text size="small" className="block overflow-hidden text-ellipsis whitespace-nowrap">
                        {item.title}
                      </Text>
                    )}
                  </div>

                  <div className="flex gap-1">
                    {isRenaming ? (
                      <>
                        <Button
                          data-testid={`file-rename-confirm-${item.documentId}`}
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onCommitRename();
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing({ mode: "idle" });
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          data-testid={`file-rename-${item.documentId}`}
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing({
                              mode: "rename",
                              documentId: item.documentId,
                              title: item.title,
                            });
                          }}
                        >
                          Rename
                        </Button>
                        <Button
                          data-testid={`file-delete-${item.documentId}`}
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onDelete(item.documentId);
                          }}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </ListItem>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
