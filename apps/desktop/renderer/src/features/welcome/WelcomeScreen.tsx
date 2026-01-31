import React from "react";

import { CreateProjectDialog } from "../projects/CreateProjectDialog";
import { useProjectStore } from "../../stores/projectStore";

/**
 * Welcome entry for a fresh profile.
 *
 * Why: provides a stable, testable P0 entry point (no current project yet).
 */
export function WelcomeScreen(): JSX.Element {
  const current = useProjectStore((s) => s.current);
  const bootstrapStatus = useProjectStore((s) => s.bootstrapStatus);
  const bootstrap = useProjectStore((s) => s.bootstrap);

  const [dialogOpen, setDialogOpen] = React.useState(false);

  React.useEffect(() => {
    if (bootstrapStatus === "idle") {
      void bootstrap();
    }
  }, [bootstrap, bootstrapStatus]);

  if (current) {
    return (
      <div
        style={{
          width: "100%",
          padding: "var(--space-6)",
          color: "var(--color-fg-muted)",
          fontSize: 13,
        }}
      >
        Current project: {current.projectId}
      </div>
    );
  }

  return (
    <>
      <div
        data-testid="welcome-screen"
        style={{
          width: "100%",
          maxWidth: 640,
          padding: "var(--space-6)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-default)",
          background: "var(--color-bg-surface)",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          Welcome to CreoNow
        </div>
        <div style={{ fontSize: 13, color: "var(--color-fg-muted)" }}>
          Create a local project to start.
        </div>

        <div style={{ marginTop: "var(--space-6)", display: "flex", gap: 8 }}>
          <button
            data-testid="welcome-create-project"
            type="button"
            onClick={() => setDialogOpen(true)}
            style={{
              height: 32,
              padding: "0 var(--space-3)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-default)",
              background: "var(--color-bg-selected)",
              color: "var(--color-fg-default)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Create project
          </button>
        </div>
      </div>

      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
