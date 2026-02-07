import React from "react";

import type {
  IpcChannelSpec,
  IpcError,
} from "../../../../../../packages/shared/types/ipc-generated";
import { Card } from "../../components/primitives/Card";
import { Button } from "../../components/primitives/Button";
import { Heading } from "../../components/primitives/Heading";
import { Text } from "../../components/primitives/Text";
import { invoke } from "../../lib/ipcClient";
import { useProjectStore } from "../../stores/projectStore";
import {
  QualityGatesPanelContent,
  type CheckGroup,
  type PanelStatus,
  type QualitySettings,
} from "../quality-gates/QualityGatesPanel";

type JudgeModelState =
  IpcChannelSpec["judge:model:getstate"]["response"]["state"];

type ConstraintsData =
  IpcChannelSpec["constraints:policy:get"]["response"]["constraints"];

/**
 * Format judge state into a human-readable label with status indicator.
 */
function formatJudgeState(state: JudgeModelState): {
  label: string;
  status: "ready" | "downloading" | "error" | "not_ready";
} {
  switch (state.status) {
    case "ready":
      return { label: "Ready", status: "ready" };
    case "downloading":
      return { label: "Downloading...", status: "downloading" };
    case "not_ready":
      return { label: "Not ready", status: "not_ready" };
    case "error":
      return { label: `Error (${state.error.code})`, status: "error" };
  }
}

/**
 * Status indicator dot.
 */
function StatusDot(props: {
  status: "ready" | "downloading" | "error" | "not_ready" | "loading";
}): JSX.Element {
  const colors = {
    ready: "bg-[var(--color-success)]",
    downloading: "bg-[var(--color-info)]",
    error: "bg-[var(--color-error)]",
    not_ready: "bg-[var(--color-warning)]",
    loading: "bg-[var(--color-fg-muted)]",
  };

  if (props.status === "downloading") {
    return (
      <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-info)] animate-pulse" />
    );
  }

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[props.status]}`}
    />
  );
}

/**
 * Judge model status section.
 */
function JudgeStatusSection(props: {
  state: JudgeModelState | null;
  error: IpcError | null;
  loading: boolean;
  onEnsure: () => void;
  ensureBusy: boolean;
}): JSX.Element {
  const { state, error, loading, onEnsure, ensureBusy } = props;

  if (loading) {
    return (
      <Card className="p-3 rounded-[var(--radius-md)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusDot status="loading" />
            <Text size="small" color="muted">
              Loading judge status...
            </Text>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-3 rounded-[var(--radius-md)] border-[var(--color-error)]/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusDot status="error" />
            <Text
              data-testid="quality-panel-judge-error"
              size="small"
              color="muted"
            >
              <span data-testid="quality-panel-judge-error-code">
                {error.code}
              </span>
              : {error.message}
            </Text>
          </div>
        </div>
      </Card>
    );
  }

  if (!state) {
    return (
      <Card className="p-3 rounded-[var(--radius-md)]">
        <Text size="small" color="muted">
          Judge status unavailable
        </Text>
      </Card>
    );
  }

  const { label, status } = formatJudgeState(state);

  return (
    <Card className="p-3 rounded-[var(--radius-md)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <Text size="small" color="default">
            Judge Model:{" "}
            <span
              data-testid="quality-panel-judge-status"
              className="font-medium"
            >
              {label}
            </span>
          </Text>
        </div>
        {status !== "ready" && status !== "downloading" && (
          <Button
            data-testid="quality-panel-judge-ensure"
            variant="secondary"
            size="sm"
            onClick={onEnsure}
            disabled={ensureBusy}
            loading={ensureBusy}
          >
            {status === "not_ready" ? "Initialize" : "Retry"}
          </Button>
        )}
      </div>
    </Card>
  );
}

/**
 * Constraints status section.
 */
function ConstraintsSection(props: {
  constraints: ConstraintsData | null;
  error: IpcError | null;
  loading: boolean;
}): JSX.Element {
  const { constraints, error, loading } = props;

  if (loading) {
    return (
      <Card className="p-3 rounded-[var(--radius-md)]">
        <Text size="small" color="muted">
          Loading constraints...
        </Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-3 rounded-[var(--radius-md)] border-[var(--color-error)]/20">
        <Text
          data-testid="quality-panel-constraints-error"
          size="small"
          color="muted"
        >
          <span data-testid="quality-panel-constraints-error-code">
            {error.code}
          </span>
          : {error.message}
        </Text>
      </Card>
    );
  }

  const count = constraints?.items.length ?? 0;

  return (
    <Card className="p-3 rounded-[var(--radius-md)]">
      <div className="flex items-center justify-between">
        <Text size="small" color="default">
          Constraints:{" "}
          <span
            data-testid="quality-panel-constraints-count"
            className="font-medium"
          >
            {count} {count === 1 ? "rule" : "rules"}
          </span>
        </Text>
      </div>
      {count > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {constraints?.items.slice(0, 5).map((item, idx) => (
            <span
              key={idx}
              className="inline-block px-2 py-0.5 text-[10px] rounded-full bg-[var(--color-bg-hover)] text-[var(--color-fg-muted)]"
            >
              {item.length > 30 ? `${item.slice(0, 30)}...` : item}
            </span>
          ))}
          {count > 5 && (
            <span className="inline-block px-2 py-0.5 text-[10px] rounded-full bg-[var(--color-bg-hover)] text-[var(--color-fg-muted)]">
              +{count - 5} more
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * Build check groups from judge state and constraints for QualityGatesPanelContent.
 *
 * Why: QualityGatesPanelContent expects checkGroups; we derive them from real IPC data
 * to avoid the "fake empty array" placeholder state.
 */
function buildCheckGroups(
  judgeState: JudgeModelState | null,
  constraints: ConstraintsData | null,
): CheckGroup[] {
  const groups: CheckGroup[] = [];

  // System checks group (judge model)
  if (judgeState) {
    const judgeStatus =
      judgeState.status === "ready"
        ? "passed"
        : judgeState.status === "error"
          ? "error"
          : judgeState.status === "downloading"
            ? "running"
            : "warning";

    groups.push({
      id: "system",
      name: "System",
      checks: [
        {
          id: "judge-model",
          name: "Judge Model",
          description: "Local AI model for quality evaluation",
          status: judgeStatus,
          resultValue: judgeState.status === "ready" ? "Available" : undefined,
        },
      ],
    });
  }

  // Constraints group
  if (constraints) {
    const constraintCount = constraints.items.length;
    groups.push({
      id: "constraints",
      name: "Writing Constraints",
      checks: [
        {
          id: "active-constraints",
          name: "Active Constraints",
          description: "Custom writing rules for this project",
          status: constraintCount > 0 ? "passed" : "warning",
          resultValue: `${constraintCount} ${constraintCount === 1 ? "rule" : "rules"} defined`,
        },
      ],
    });
  }

  return groups;
}

/**
 * Derive panel status from judge state and constraints.
 */
function derivePanelStatus(
  judgeState: JudgeModelState | null,
  judgeError: IpcError | null,
  constraintsError: IpcError | null,
  loading: boolean,
): PanelStatus {
  if (loading) {
    return "running";
  }

  if (judgeError || constraintsError) {
    return "errors";
  }

  if (judgeState?.status === "error") {
    return "errors";
  }

  if (judgeState?.status === "downloading") {
    return "running";
  }

  if (judgeState?.status === "not_ready") {
    return "issues-found";
  }

  return "all-passed";
}

/**
 * QualityPanel wires the QualityGatesPanelContent to real IPC data.
 *
 * Why: P0-010 requires the Quality tab to show real judge/constraints status
 * with observable error handling (not silent failure, not fake empty array).
 *
 * IPC dependencies:
 * - judge:model:getstate: get current judge model status
 * - judge:model:ensure: trigger model download/initialization
 * - constraints:policy:get: get project constraints
 *
 * @example
 * ```tsx
 * <QualityPanel />
 * ```
 */
export function QualityPanel(): JSX.Element {
  const projectId = useProjectStore((s) => s.current?.projectId ?? null);

  // Judge model state
  const [judgeState, setJudgeState] = React.useState<JudgeModelState | null>(
    null,
  );
  const [judgeError, setJudgeError] = React.useState<IpcError | null>(null);
  const [judgeLoading, setJudgeLoading] = React.useState(true);
  const [ensureBusy, setEnsureBusy] = React.useState(false);

  // Constraints state
  const [constraints, setConstraints] = React.useState<ConstraintsData | null>(
    null,
  );
  const [constraintsError, setConstraintsError] =
    React.useState<IpcError | null>(null);
  const [constraintsLoading, setConstraintsLoading] = React.useState(true);

  // Settings state for QualityGatesPanelContent
  const [settings, setSettings] = React.useState<QualitySettings>({
    runOnSave: true,
    blockOnErrors: false,
    frequency: "on-demand",
  });
  const [settingsExpanded, setSettingsExpanded] = React.useState(false);
  const [expandedCheckId, setExpandedCheckId] = React.useState<string | null>(
    null,
  );

  // Fetch judge state
  const fetchJudgeState = React.useCallback(async () => {
    const res = await invoke("judge:model:getstate", {});
    if (res.ok) {
      setJudgeState(res.data.state);
      setJudgeError(null);
    } else {
      setJudgeState(null);
      setJudgeError(res.error);
    }
    setJudgeLoading(false);
  }, []);

  // Fetch constraints
  const fetchConstraints = React.useCallback(async () => {
    if (!projectId) {
      setConstraints(null);
      setConstraintsError(null);
      setConstraintsLoading(false);
      return;
    }

    const res = await invoke("constraints:policy:get", { projectId });
    if (res.ok) {
      setConstraints(res.data.constraints);
      setConstraintsError(null);
    } else {
      // CRITICAL: Do NOT treat failure as empty constraints (that's silent failure)
      setConstraints(null);
      setConstraintsError(res.error);
    }
    setConstraintsLoading(false);
  }, [projectId]);

  // Initial fetch
  React.useEffect(() => {
    void fetchJudgeState();
    void fetchConstraints();
  }, [fetchJudgeState, fetchConstraints]);

  // Handle ensure button
  const handleEnsure = React.useCallback(async () => {
    if (ensureBusy) {
      return;
    }

    setEnsureBusy(true);
    setJudgeError(null);
    setJudgeState({ status: "downloading" });

    try {
      const res = await invoke("judge:model:ensure", {});
      if (res.ok) {
        setJudgeState(res.data.state);
      } else {
        setJudgeError(res.error);
        setJudgeState({
          status: "error",
          error: { code: res.error.code, message: res.error.message },
        });
      }
    } finally {
      setEnsureBusy(false);
    }
  }, [ensureBusy]);

  // Handle run all checks
  const handleRunAllChecks = React.useCallback(async () => {
    setJudgeLoading(true);
    setConstraintsLoading(true);
    await fetchJudgeState();
    await fetchConstraints();
  }, [fetchJudgeState, fetchConstraints]);

  // Build check groups and panel status
  const checkGroups = buildCheckGroups(judgeState, constraints);
  const panelStatus = derivePanelStatus(
    judgeState,
    judgeError,
    constraintsError,
    judgeLoading || constraintsLoading,
  );

  // Count issues (errors are issues)
  const issuesCount =
    (judgeError ? 1 : 0) +
    (constraintsError ? 1 : 0) +
    (judgeState?.status === "error" ? 1 : 0) +
    (judgeState?.status === "not_ready" ? 1 : 0);

  // No project selected
  if (!projectId) {
    return (
      <div
        data-testid="quality-panel"
        className="flex flex-col gap-4 p-4 h-full overflow-auto"
      >
        <Heading level="h3" className="font-bold text-[15px]">
          Quality
        </Heading>

        <Card className="p-4 rounded-[var(--radius-md)]">
          <Text
            data-testid="quality-panel-no-project"
            size="small"
            color="muted"
            className="text-center"
          >
            No project selected
          </Text>
        </Card>

        <section>
          <Heading level="h4" className="mb-2 font-semibold text-[13px]">
            Judge Model
          </Heading>
          <JudgeStatusSection
            state={judgeState}
            error={judgeError}
            loading={judgeLoading}
            onEnsure={handleEnsure}
            ensureBusy={ensureBusy}
          />
        </section>
      </div>
    );
  }

  return (
    <div data-testid="quality-panel" className="flex flex-col h-full">
      {/* Summary section with real status */}
      <div className="p-4 space-y-4 border-b border-[var(--color-separator)]">
        <section>
          <Heading level="h4" className="mb-2 font-semibold text-[13px]">
            Judge Model
          </Heading>
          <JudgeStatusSection
            state={judgeState}
            error={judgeError}
            loading={judgeLoading}
            onEnsure={handleEnsure}
            ensureBusy={ensureBusy}
          />
        </section>

        <section>
          <Heading level="h4" className="mb-2 font-semibold text-[13px]">
            Project Constraints
          </Heading>
          <ConstraintsSection
            constraints={constraints}
            error={constraintsError}
            loading={constraintsLoading}
          />
        </section>
      </div>

      {/* Quality Gates Panel with real data */}
      <div className="flex-1 min-h-0">
        <QualityGatesPanelContent
          checkGroups={checkGroups}
          panelStatus={panelStatus}
          issuesCount={issuesCount > 0 ? issuesCount : undefined}
          expandedCheckId={expandedCheckId}
          onToggleCheck={(id) =>
            setExpandedCheckId((prev) => (prev === id ? null : id))
          }
          onRunAllChecks={handleRunAllChecks}
          settings={settings}
          onSettingsChange={setSettings}
          settingsExpanded={settingsExpanded}
          onToggleSettings={() => setSettingsExpanded((prev) => !prev)}
          showCloseButton={false}
        />
      </div>
    </div>
  );
}
