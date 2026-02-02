import React from "react";

import { Button, Card, Text } from "../../components/primitives";
import { useProjectStore } from "../../stores/projectStore";
import { useFileStore } from "../../stores/fileStore";
import { useMemoryStore } from "../../stores/memoryStore";
import { MemorySettingsDialog } from "./MemorySettingsDialog";
import { MemoryCreateDialog } from "./MemoryCreateDialog";

type MemoryScope = "global" | "project" | "document";

/**
 * Settings icon (gear) for opening the settings dialog.
 */
function SettingsIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/**
 * Plus icon for adding new memory.
 */
function PlusIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/**
 * Scope tab button styles.
 */
const tabButtonBase = [
  "text-xs",
  "px-2",
  "py-1",
  "rounded-[var(--radius-md)]",
  "border",
  "text-[var(--color-fg-default)]",
  "cursor-pointer",
  "transition-colors",
  "duration-[var(--duration-fast)]",
  "hover:bg-[var(--color-bg-hover)]",
  "focus-visible:outline",
  "focus-visible:outline-[length:var(--ring-focus-width)]",
  "focus-visible:outline-offset-[var(--ring-focus-offset)]",
  "focus-visible:outline-[var(--color-ring-focus)]",
].join(" ");

const tabButtonActive =
  "border-[var(--color-border-focus)] bg-[var(--color-bg-selected)]";
const tabButtonInactive =
  "border-[var(--color-border-default)] bg-[var(--color-bg-surface)]";
const tabButtonDisabled = "opacity-50 cursor-not-allowed";

/**
 * Get human-readable scope label.
 */
function getScopeLabel(scope: MemoryScope): string {
  switch (scope) {
    case "global":
      return "全局";
    case "project":
      return "项目";
    case "document":
      return "文档";
  }
}

/**
 * MemoryPanel is the UI surface for memory CRUD with three-layer
 * scope tabs (global → project → document).
 *
 * Layout optimized for user workflow:
 * 1. Header with settings gear
 * 2. Scope tabs for filtering
 * 3. Memory list (main content area)
 * 4. Add button (opens dialog)
 */
export function MemoryPanel(): JSX.Element {
  const projectId = useProjectStore((s) => s.current?.projectId ?? null);
  const documentId = useFileStore((s) => s.currentDocumentId);

  const bootstrapStatus = useMemoryStore((s) => s.bootstrapStatus);
  const items = useMemoryStore((s) => s.items);
  const lastError = useMemoryStore((s) => s.lastError);

  const bootstrapForContext = useMemoryStore((s) => s.bootstrapForContext);
  const remove = useMemoryStore((s) => s.remove);
  const clearError = useMemoryStore((s) => s.clearError);

  // UI state
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [activeScope, setActiveScope] = React.useState<MemoryScope>("global");

  React.useEffect(() => {
    void bootstrapForContext(projectId, documentId);
  }, [bootstrapForContext, projectId, documentId]);

  // Reset scope when context changes
  React.useEffect(() => {
    if (projectId === null) {
      if (activeScope !== "global") {
        setActiveScope("global");
      }
    } else if (documentId === null && activeScope === "document") {
      setActiveScope("project");
    }
  }, [activeScope, projectId, documentId]);

  const disabledProjectScope = projectId === null;
  const disabledDocumentScope = documentId === null;

  // Filter items by activeScope
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => item.scope === activeScope);
  }, [items, activeScope]);

  return (
    <section
      data-testid="memory-panel"
      className="flex flex-col gap-3 p-3 h-full min-h-0"
    >
      {/* Header with settings button */}
      <header className="flex items-center gap-2 shrink-0">
        <Text size="small" color="muted">Memory</Text>
        <Text size="tiny" color="muted" className="ml-auto">
          {bootstrapStatus}
        </Text>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="p-1 rounded hover:bg-[var(--color-bg-hover)] transition-colors"
          data-testid="memory-settings-button"
          aria-label="打开记忆设置"
        >
          <SettingsIcon className="text-[var(--color-fg-muted)]" />
        </button>
      </header>

      {/* Scope tabs */}
      <div className="flex gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setActiveScope("global")}
          className={`${tabButtonBase} ${activeScope === "global" ? tabButtonActive : tabButtonInactive}`}
          data-testid="memory-scope-global"
        >
          Global
        </button>
        <button
          type="button"
          onClick={() => setActiveScope("project")}
          disabled={disabledProjectScope}
          className={`${tabButtonBase} ${activeScope === "project" ? tabButtonActive : tabButtonInactive} ${disabledProjectScope ? tabButtonDisabled : ""}`}
          data-testid="memory-scope-project"
        >
          Project
        </button>
        <button
          type="button"
          onClick={() => setActiveScope("document")}
          disabled={disabledDocumentScope}
          className={`${tabButtonBase} ${activeScope === "document" ? tabButtonActive : tabButtonInactive} ${disabledDocumentScope ? tabButtonDisabled : ""}`}
          data-testid="memory-scope-document"
        >
          Document
        </button>
      </div>

      {/* Error display */}
      {lastError ? (
        <Card noPadding className="p-2.5 shrink-0">
          <div className="flex gap-2 items-center">
            <Text data-testid="memory-error-code" size="code" color="muted">
              {lastError.code}
            </Text>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </div>
          <Text size="small" color="muted" className="mt-1.5 block">
            {lastError.message}
          </Text>
        </Card>
      ) : null}

      {/* Memory list - main content area */}
      <Card noPadding className="p-2.5 flex-1 overflow-auto flex flex-col gap-2 min-h-0">
        <Text size="small" color="muted" className="shrink-0">
          {filteredItems.length} 条{getScopeLabel(activeScope)}记忆
        </Text>

        {filteredItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <Text size="small" color="muted">还没有{getScopeLabel(activeScope)}记忆</Text>
          </div>
        ) : (
          <div className="flex flex-col gap-2 overflow-auto">
            {filteredItems.map((item) => (
              <Card
                key={item.memoryId}
                data-testid={`memory-item-${item.memoryId}`}
                noPadding
                className="p-2 flex gap-2 items-start shrink-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex gap-1.5">
                    <Text size="code" color="muted">{item.type}</Text>
                    <Text size="code" color="muted">{item.origin === "manual" ? "手动" : "AI学习"}</Text>
                  </div>
                  <Text size="small" className="mt-1.5 block whitespace-pre-wrap break-words">
                    {item.content}
                  </Text>
                </div>
                <Button
                  data-testid={`memory-delete-${item.memoryId}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => void remove({ memoryId: item.memoryId })}
                >
                  删除
                </Button>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Add button */}
      <button
        type="button"
        data-testid="memory-create-button"
        onClick={() => setCreateOpen(true)}
        className="shrink-0 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-fg-default)] text-sm hover:bg-[var(--color-bg-hover)] transition-colors"
      >
        <PlusIcon className="text-[var(--color-fg-muted)]" />
        <span>添加新记忆</span>
      </button>

      {/* Settings dialog */}
      <MemorySettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      {/* Create dialog */}
      <MemoryCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        scope={activeScope}
        scopeLabel={getScopeLabel(activeScope)}
      />
    </section>
  );
}
