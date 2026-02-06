import React from "react";

import { Button } from "../primitives/Button";
import { Text } from "../primitives/Text";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  onReload?: () => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  details: string;
  copyStatus: "idle" | "copied" | "failed";
};

/**
 * Reload the current renderer window.
 *
 * Why: exported helper is easy to assert in tests without mutating Location.
 */
export function reloadRendererWindow(): void {
  window.location.reload();
}

/**
 * ErrorBoundary catches render-time crashes and keeps the shell recoverable.
 *
 * Why: a single widget crash must not blank the whole renderer surface.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, details: "", copyStatus: "idle" };
  }

  public static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const componentStack =
      info.componentStack?.trim() ?? "(no component stack)";
    const details = [
      `${error.name}: ${error.message}`,
      "",
      "Component stack:",
      componentStack,
    ].join("\n");
    this.setState({ details, copyStatus: "idle" });
  }

  /**
   * Reload the renderer to recover from an unrecoverable render crash.
   */
  private readonly handleReload = (): void => {
    if (this.props.onReload) {
      this.props.onReload();
      return;
    }
    reloadRendererWindow();
  };

  /**
   * Copy full error diagnostics so users can report actionable crash details.
   */
  private readonly handleCopyDetails = async (): Promise<void> => {
    if (!navigator.clipboard?.writeText) {
      this.setState({ copyStatus: "failed" });
      return;
    }

    try {
      await navigator.clipboard.writeText(this.state.details);
      this.setState({ copyStatus: "copied" });
    } catch {
      this.setState({ copyStatus: "failed" });
    }
  };

  public render(): JSX.Element {
    if (!this.state.hasError) {
      return this.props.children as JSX.Element;
    }

    return (
      <div
        data-testid="app-error-boundary"
        className="h-full w-full bg-[var(--color-bg-base)] p-6"
      >
        <div className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-[var(--color-separator)] bg-[var(--color-bg-surface)] p-6 shadow-[var(--shadow-lg)]">
          <h1 className="text-lg font-semibold text-[var(--color-fg-default)]">
            App crashed
          </h1>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            A render error occurred. You can reload the app or copy details for
            diagnostics.
          </p>

          {this.state.details ? (
            <pre
              data-testid="app-error-details"
              className="mt-4 max-h-60 overflow-auto rounded-[var(--radius-sm)] border border-[var(--color-separator)] bg-[var(--color-bg-hover)] p-3 text-xs text-[var(--color-fg-muted)]"
            >
              {this.state.details}
            </pre>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={this.handleReload}
            >
              Reload App
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void this.handleCopyDetails()}
            >
              Copy error details
            </Button>
          </div>

          {this.state.copyStatus === "copied" ? (
            <Text
              data-testid="app-error-copy-status"
              size="small"
              className="mt-3 text-[var(--color-success)]"
            >
              Error details copied.
            </Text>
          ) : null}
          {this.state.copyStatus === "failed" ? (
            <Text
              data-testid="app-error-copy-status"
              size="small"
              className="mt-3 text-[var(--color-error)]"
            >
              Failed to copy error details.
            </Text>
          ) : null}
        </div>
      </div>
    );
  }
}
