import React from "react";

import { CreateProjectDialog } from "../projects/CreateProjectDialog";
import { useProjectStore } from "../../stores/projectStore";
import { Button, Card, Heading, Text } from "../../components/primitives";

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
      <Text as="div" size="body" color="muted" className="w-full p-6">
        Current project: {current.projectId}
      </Text>
    );
  }

  return (
    <>
      <Card
        data-testid="welcome-screen"
        className="w-full max-w-[640px] rounded-[var(--radius-lg)]"
      >
        <Heading level="h2" className="mb-2 text-lg font-bold">
          Welcome to CreoNow
        </Heading>
        <Text size="body" color="muted">
          Create a local project to start.
        </Text>

        <div className="mt-6 flex gap-2">
          <Button
            data-testid="welcome-create-project"
            variant="secondary"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="bg-[var(--color-bg-selected)]"
          >
            Create project
          </Button>
        </div>
      </Card>

      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
