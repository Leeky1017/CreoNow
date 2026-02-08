import React from "react";

import {
  Button,
  ContextMenu,
  Input,
  ListItem,
  Popover,
  PopoverClose,
  Text,
  type ContextMenuItem,
} from "../../components/primitives";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { useEditorStore } from "../../stores/editorStore";
import { useFileStore } from "../../stores/fileStore";
import { SystemDialog } from "../../components/features/AiDialogs/SystemDialog";
import type { DocumentType } from "../../stores/fileStore";

type EditingState =
  | { mode: "idle" }
  | { mode: "rename"; documentId: string; title: string };

export interface FileTreePanelProps {
  projectId: string;
  /**
   * 首次渲染时自动进入某个文档的 Rename 模式。
   *
   * Why: 仅用于 Storybook/QA 快速复现并验证 Rename 溢出问题，避免依赖复杂交互路径。
   */
  initialRenameDocumentId?: string;
}

/**
 * Resolve display icon by document type.
 *
 * Why: file tree must expose type differences visually for quick scanning.
 */
function iconForType(type: DocumentType): string {
  switch (type) {
    case "chapter":
      return "📄";
    case "note":
      return "📝";
    case "setting":
      return "📘";
    case "timeline":
      return "🕒";
    case "character":
      return "👤";
    default:
      return "📄";
  }
}

/**
 * Resolve untitled title by document type.
 *
 * Why: new document enters rename mode and needs deterministic initial text.
 */
function defaultTitleByType(type: DocumentType): string {
  switch (type) {
    case "chapter":
      return "Untitled Chapter";
    case "note":
      return "Untitled Note";
    case "setting":
      return "Untitled Setting";
    case "timeline":
      return "Untitled Timeline";
    case "character":
      return "Untitled Character";
    default:
      return "Untitled";
  }
}

/**
 * FileTreePanel renders the project-scoped documents list (DB SSOT) and actions.
 *
 * Why: P0-015 requires a minimal documents loop with stable selectors for Windows E2E.
 */
export function FileTreePanel(props: FileTreePanelProps): JSX.Element {
  const items = useFileStore((s) => s.items);
  const currentDocumentId = useFileStore((s) => s.currentDocumentId);
  const bootstrapStatus = useFileStore((s) => s.bootstrapStatus);
  const lastError = useFileStore((s) => s.lastError);

  const createAndSetCurrent = useFileStore((s) => s.createAndSetCurrent);
  const rename = useFileStore((s) => s.rename);
  const updateStatus = useFileStore((s) => s.updateStatus);
  const deleteDocument = useFileStore((s) => s.delete);
  const setCurrent = useFileStore((s) => s.setCurrent);
  const clearError = useFileStore((s) => s.clearError);

  const openDocument = useEditorStore((s) => s.openDocument);
  const { confirm, dialogProps } = useConfirmDialog();
  const openCurrentForProject = useEditorStore(
    (s) => s.openCurrentDocumentForProject,
  );

  const [editing, setEditing] = React.useState<EditingState>({ mode: "idle" });
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const initialRenameAppliedRef = React.useRef(false);
  React.useEffect(() => {
    if (!props.initialRenameDocumentId) {
      return;
    }
    if (initialRenameAppliedRef.current) {
      return;
    }
    if (editing.mode !== "idle") {
      return;
    }

    const doc = items.find(
      (i) => i.documentId === props.initialRenameDocumentId,
    );
    if (!doc) {
      return;
    }

    initialRenameAppliedRef.current = true;
    setEditing({
      mode: "rename",
      documentId: doc.documentId,
      title: doc.title,
    });
  }, [editing.mode, items, props.initialRenameDocumentId]);

  React.useEffect(() => {
    if (editing.mode !== "rename") {
      return;
    }

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing.mode]);

  async function onCreate(type: DocumentType = "chapter"): Promise<void> {
    const res = await createAndSetCurrent({
      projectId: props.projectId,
      type,
    });
    if (!res.ok) {
      return;
    }
    await openDocument({
      projectId: props.projectId,
      documentId: res.data.documentId,
    });
    setEditing({
      mode: "rename",
      documentId: res.data.documentId,
      title: defaultTitleByType(type),
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
    const confirmed = await confirm({
      title: "Delete Document?",
      description:
        "This action cannot be undone. The document and its version history will be permanently deleted.",
      primaryLabel: "Delete",
      secondaryLabel: "Cancel",
    });
    if (!confirmed) {
      return;
    }

    const res = await deleteDocument({
      projectId: props.projectId,
      documentId,
    });
    if (!res.ok) {
      return;
    }

    await openCurrentForProject(props.projectId);
  }

  async function onToggleStatus(args: {
    documentId: string;
    next: "draft" | "final";
  }): Promise<void> {
    const res = await updateStatus({
      projectId: props.projectId,
      documentId: args.documentId,
      status: args.next,
    });
    if (!res.ok) {
      return;
    }
    if (currentDocumentId === args.documentId) {
      await openDocument({
        projectId: props.projectId,
        documentId: args.documentId,
      });
    }
  }

  return (
    <div data-testid="sidebar-files" className="flex flex-col min-h-0">
      <div className="flex items-center justify-between p-3 border-b border-[var(--color-separator)]">
        <Text size="small" color="muted">
          Files
        </Text>
        <Button
          data-testid="file-create"
          variant="secondary"
          size="sm"
          onClick={() => void onCreate("chapter")}
        >
          New
        </Button>
        <Button
          data-testid="file-create-note"
          variant="ghost"
          size="sm"
          onClick={() => void onCreate("note")}
        >
          Note
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
          <Button variant="secondary" size="sm" onClick={() => clearError()}>
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

              const contextMenuItems: ContextMenuItem[] = [
                {
                  key: "rename",
                  label: "Rename",
                  onSelect: () => {
                    setEditing({
                      mode: "rename",
                      documentId: item.documentId,
                      title: item.title,
                    });
                  },
                },
                {
                  key: "delete",
                  label: "Delete",
                  onSelect: () => void onDelete(item.documentId),
                  destructive: true,
                },
                {
                  key: "status",
                  label:
                    item.status === "final" ? "Mark as Draft" : "Mark as Final",
                  onSelect: () =>
                    void onToggleStatus({
                      documentId: item.documentId,
                      next: item.status === "final" ? "draft" : "final",
                    }),
                },
              ];

              // Rename mode: show inline input with fixed width
              if (isRenaming) {
                return (
                  <div
                    key={item.documentId}
                    data-testid={`file-row-${item.documentId}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border-focus)] bg-[var(--color-bg-selected)] overflow-hidden"
                  >
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
                      onBlur={() => void onCommitRename()}
                      className="h-6 text-xs flex-1 min-w-0 max-w-full"
                    />
                    <div className="flex gap-1 shrink-0">
                      <Button
                        data-testid={`file-rename-confirm-${item.documentId}`}
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onCommitRename();
                        }}
                      >
                        OK
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing({ mode: "idle" });
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                );
              }

              // Normal mode: show file with actions menu
              return (
                <ContextMenu key={item.documentId} items={contextMenuItems}>
                  <ListItem
                    data-testid={`file-row-${item.documentId}`}
                    aria-selected={selected}
                    selected={selected}
                    interactive
                    compact
                    onClick={() => void onSelect(item.documentId)}
                    className={`border ${selected ? "border-[var(--color-border-focus)]" : "border-transparent"} group`}
                  >
                    <span
                      data-testid={`file-type-icon-${item.documentId}`}
                      className="shrink-0"
                      aria-hidden="true"
                    >
                      {iconForType(item.type)}
                    </span>
                    <Text
                      size="small"
                      className="block overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0"
                    >
                      {item.title}
                    </Text>
                    {item.status === "final" ? (
                      <span
                        data-testid={`file-status-final-${item.documentId}`}
                        className="inline-block w-2 h-2 rounded-full bg-[var(--color-success)] shrink-0"
                      />
                    ) : null}
                    <Popover
                      trigger={
                        <Button
                          data-testid={`file-actions-${item.documentId}`}
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0 w-6 h-6 p-0"
                        >
                          ⋯
                        </Button>
                      }
                      side="bottom"
                      align="end"
                    >
                      <div className="flex flex-col gap-1 -m-2">
                        <PopoverClose asChild>
                          <Button
                            data-testid={`file-rename-${item.documentId}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing({
                                mode: "rename",
                                documentId: item.documentId,
                                title: item.title,
                              });
                            }}
                            className="justify-start w-full"
                          >
                            Rename
                          </Button>
                        </PopoverClose>
                        <PopoverClose asChild>
                          <Button
                            data-testid={`file-status-toggle-${item.documentId}`}
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              void onToggleStatus({
                                documentId: item.documentId,
                                next:
                                  item.status === "final" ? "draft" : "final",
                              })
                            }
                            className="justify-start w-full"
                          >
                            {item.status === "final"
                              ? "Mark as Draft"
                              : "Mark as Final"}
                          </Button>
                        </PopoverClose>
                        <PopoverClose asChild>
                          <Button
                            data-testid={`file-delete-${item.documentId}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => void onDelete(item.documentId)}
                            className="justify-start w-full text-[var(--color-error)]"
                          >
                            Delete
                          </Button>
                        </PopoverClose>
                      </div>
                    </Popover>
                  </ListItem>
                </ContextMenu>
              );
            })}
          </div>
        )}
      </div>
      <SystemDialog {...dialogProps} />
    </div>
  );
}
