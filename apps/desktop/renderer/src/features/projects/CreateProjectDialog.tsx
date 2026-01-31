import React from "react";

import { useProjectStore } from "../../stores/projectStore";

/**
 * Minimal create project dialog (P0).
 *
 * Why: provides a stable E2E entry point for creating and setting current
 * project, without relying on native OS dialogs.
 */
export function CreateProjectDialog(props: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}): JSX.Element | null {
  const createAndSetCurrent = useProjectStore((s) => s.createAndSetCurrent);
  const clearError = useProjectStore((s) => s.clearError);
  const lastError = useProjectStore((s) => s.lastError);

  const [name, setName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!props.open) {
      setName("");
      setSubmitting(false);
      clearError();
    }
  }, [clearError, props.open]);

  if (!props.open) {
    return null;
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (submitting) {
      return;
    }

    setSubmitting(true);
    const res = await createAndSetCurrent({ name });
    setSubmitting(false);
    if (!res.ok) {
      return;
    }

    props.onOpenChange(false);
  }

  return (
    <div className="cn-overlay">
      <div
        data-testid="create-project-dialog"
        role="dialog"
        aria-modal="true"
        style={{
          width: 520,
          borderRadius: "var(--radius-lg)",
          background: "var(--color-bg-raised)",
          border: "1px solid var(--color-border-default)",
          padding: "var(--space-6)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ marginBottom: "var(--space-4)" }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Create project</div>
          <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
            Creates a local project under your app profile.
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              color: "var(--color-fg-muted)",
              marginBottom: "var(--space-2)",
            }}
          >
            Name (optional)
          </label>
          <input
            data-testid="create-project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="Untitled"
            style={{
              width: "100%",
              height: 36,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-default)",
              background: "var(--color-bg-surface)",
              color: "var(--color-fg-default)",
              padding: "0 var(--space-3)",
              outline: "none",
              marginBottom: "var(--space-4)",
            }}
          />

          {lastError ? (
            <div
              style={{
                marginBottom: "var(--space-4)",
                fontSize: 12,
                color: "var(--color-fg-muted)",
              }}
            >
              {lastError.code}: {lastError.message}
            </div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={() => props.onOpenChange(false)}
              style={{
                height: 32,
                padding: "0 var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-default)",
                background: "transparent",
                color: "var(--color-fg-default)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              data-testid="create-project-submit"
              type="submit"
              disabled={submitting}
              style={{
                height: 32,
                padding: "0 var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-default)",
                background: "var(--color-bg-selected)",
                color: "var(--color-fg-default)",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
