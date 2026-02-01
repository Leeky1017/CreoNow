import React from "react";

import { Button } from "../../components/primitives/Button";
import { Dialog } from "../../components/primitives/Dialog";
import { Input } from "../../components/primitives/Input";
import { Text } from "../../components/primitives/Text";
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
}): JSX.Element {
  const createAndSetCurrent = useProjectStore((s) => s.createAndSetCurrent);
  const clearError = useProjectStore((s) => s.clearError);
  const lastError = useProjectStore((s) => s.lastError);

  const [name, setName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const formId = "create-project-form";

  React.useEffect(() => {
    if (!props.open) {
      setName("");
      setSubmitting(false);
      clearError();
    }
  }, [clearError, props.open]);

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
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Create project"
      description="Creates a local project under your app profile."
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => props.onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            data-testid="create-project-submit"
            variant="primary"
            size="sm"
            loading={submitting}
            type="submit"
            form={formId}
          >
            {submitting ? "Creating…" : "Create"}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        data-testid="create-project-dialog"
        onSubmit={(e) => void onSubmit(e)}
      >
        <label className="block mb-2">
          <Text size="small" color="muted">
            Name (optional)
          </Text>
        </label>
        <Input
          data-testid="create-project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          placeholder="Untitled"
          fullWidth
          className="mb-4"
        />

        {lastError ? (
          <Text size="small" color="muted" as="div" className="mb-4">
            {lastError.code}: {lastError.message}
          </Text>
        ) : null}
      </form>
    </Dialog>
  );
}
