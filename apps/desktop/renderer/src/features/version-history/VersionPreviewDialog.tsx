import { Dialog } from "../../components/primitives/Dialog";
import { Button } from "../../components/primitives/Button";
import { Textarea } from "../../components/primitives/Textarea";
import { Text } from "../../components/primitives/Text";

type PreviewVersion = {
  versionId: string;
  actor: "user" | "auto" | "ai";
  reason: string;
  createdAt: number;
  contentText: string;
};

type VersionPreviewDialogProps = {
  open: boolean;
  loading: boolean;
  data: PreviewVersion | null;
  error: { code: string; message: string } | null;
  onOpenChange: (open: boolean) => void;
};

/**
 * Convert actor value into dialog display text.
 */
function formatActor(actor: "user" | "auto" | "ai"): string {
  if (actor === "user") return "User";
  if (actor === "ai") return "AI";
  return "Auto-save";
}

/**
 * VersionPreviewDialog shows a read-only historical snapshot.
 *
 * Why: users need safe inspection before deciding whether to restore.
 */
export function VersionPreviewDialog(
  props: VersionPreviewDialogProps,
): JSX.Element {
  const footer = (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => props.onOpenChange(false)}
    >
      Close
    </Button>
  );

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Version Preview"
      description="Read-only historical snapshot."
      footer={footer}
    >
      <div data-testid="version-preview-dialog" className="space-y-3">
        {props.loading ? (
          <Text
            data-testid="version-preview-loading"
            size="small"
            color="muted"
          >
            Loading version content...
          </Text>
        ) : null}

        {!props.loading && props.error ? (
          <div
            data-testid="version-preview-error"
            className="rounded-[var(--radius-sm)] border border-[var(--color-error)] bg-[var(--color-error-subtle)] p-3"
          >
            <Text size="small" className="text-[var(--color-error)]">
              {props.error.code}: {props.error.message}
            </Text>
          </div>
        ) : null}

        {!props.loading && !props.error && props.data ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-xs text-[var(--color-fg-muted)]">
              <div>
                <span className="font-medium text-[var(--color-fg-default)]">
                  Actor:
                </span>{" "}
                {formatActor(props.data.actor)}
              </div>
              <div>
                <span className="font-medium text-[var(--color-fg-default)]">
                  Timestamp:
                </span>{" "}
                {new Date(props.data.createdAt).toLocaleString()}
              </div>
              <div className="col-span-2">
                <span className="font-medium text-[var(--color-fg-default)]">
                  Reason:
                </span>{" "}
                {props.data.reason}
              </div>
            </div>
            <Textarea
              data-testid="version-preview-content"
              value={props.data.contentText}
              readOnly
              rows={14}
              fullWidth
              className="resize-none"
            />
          </>
        ) : null}
      </div>
    </Dialog>
  );
}
