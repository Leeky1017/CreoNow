import React from "react";

import { Button, Card, Text, Textarea } from "../../components/primitives";
import { useAiStore, type AiStatus } from "../../stores/aiStore";
import { useContextStore } from "../../stores/contextStore";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";
import { unifiedDiff } from "../../lib/diff/unifiedDiff";
import { ContextViewer } from "./ContextViewer";
import { DiffView } from "./DiffView";
import { applySelection, captureSelectionRef } from "./applySelection";
import { SkillPicker } from "./SkillPicker";
import { useAiStream } from "./useAiStream";

/**
 * Check if a given status represents an in-flight run.
 *
 * Why: the UI must disable conflicting actions while a run is active.
 */
function isRunning(status: AiStatus): boolean {
  return status === "running" || status === "streaming";
}

/**
 * AiPanel is the minimal UI surface for P0 AI runtime.
 *
 * Why: Windows E2E must be able to drive stream/cancel/timeout/upstream-error
 * without depending on editor integrations.
 */
export function AiPanel(): JSX.Element {
  useAiStream();

  const status = useAiStore((s) => s.status);
  const stream = useAiStore((s) => s.stream);
  const selectedSkillId = useAiStore((s) => s.selectedSkillId);
  const skills = useAiStore((s) => s.skills);
  const skillsStatus = useAiStore((s) => s.skillsStatus);
  const skillsLastError = useAiStore((s) => s.skillsLastError);
  const input = useAiStore((s) => s.input);
  const outputText = useAiStore((s) => s.outputText);
  const lastRunId = useAiStore((s) => s.lastRunId);
  const lastError = useAiStore((s) => s.lastError);
  const selectionRef = useAiStore((s) => s.selectionRef);
  const selectionText = useAiStore((s) => s.selectionText);
  const proposal = useAiStore((s) => s.proposal);
  const applyStatus = useAiStore((s) => s.applyStatus);

  const setInput = useAiStore((s) => s.setInput);
  const setStream = useAiStore((s) => s.setStream);
  const setSelectedSkillId = useAiStore((s) => s.setSelectedSkillId);
  const refreshSkills = useAiStore((s) => s.refreshSkills);
  const clearError = useAiStore((s) => s.clearError);
  const setError = useAiStore((s) => s.setError);
  const setSelectionSnapshot = useAiStore((s) => s.setSelectionSnapshot);
  const setProposal = useAiStore((s) => s.setProposal);
  const persistAiApply = useAiStore((s) => s.persistAiApply);
  const logAiApplyConflict = useAiStore((s) => s.logAiApplyConflict);
  const run = useAiStore((s) => s.run);
  const cancel = useAiStore((s) => s.cancel);

  const editor = useEditorStore((s) => s.editor);
  const projectId = useEditorStore((s) => s.projectId);
  const documentId = useEditorStore((s) => s.documentId);

  const currentProject = useProjectStore((s) => s.current);

  const viewerOpen = useContextStore((s) => s.viewerOpen);
  const toggleViewer = useContextStore((s) => s.toggleViewer);
  const refreshContext = useContextStore((s) => s.refresh);

  const [skillsOpen, setSkillsOpen] = React.useState(false);

  React.useEffect(() => {
    void refreshSkills();
  }, [refreshSkills]);

  React.useEffect(() => {
    if (status !== "idle") {
      return;
    }
    if (proposal || !lastRunId || outputText.trim().length === 0) {
      return;
    }
    if (!selectionRef || selectionText.length === 0) {
      return;
    }

    setProposal({
      runId: lastRunId,
      selectionRef,
      selectionText,
      replacementText: outputText,
    });
  }, [
    lastRunId,
    outputText,
    proposal,
    selectionRef,
    selectionText,
    setProposal,
    status,
  ]);

  const diffText = proposal
    ? unifiedDiff({
        oldText: proposal.selectionText,
        newText: proposal.replacementText,
      })
    : "";

  const canApply =
    !!editor &&
    !!proposal &&
    !!projectId &&
    !!documentId &&
    applyStatus !== "applying";

  /**
   * Assemble context and run the selected skill.
   *
   * Why: CNWB-REQ-060 requires prompt injection to be redacted and auditable.
   */
  async function onRun(): Promise<void> {
    setProposal(null);
    setError(null);

    if (editor) {
      const captured = captureSelectionRef(editor);
      if (captured.ok) {
        setSelectionSnapshot(captured.data);
      } else {
        setSelectionSnapshot(null);
      }
    } else {
      setSelectionSnapshot(null);
    }

    const assembled = await refreshContext({
      projectId: currentProject?.projectId ?? projectId ?? null,
      skillId: selectedSkillId ?? null,
      immediateInput: input,
    });

    await run({
      inputOverride: assembled.promptText,
      context: {
        projectId: currentProject?.projectId ?? projectId ?? undefined,
        documentId: documentId ?? undefined,
      },
      promptDiagnostics: assembled.hashes,
    });
  }

  function onReject(): void {
    setProposal(null);
    setSelectionSnapshot(null);
  }

  async function onApply(): Promise<void> {
    if (!editor || !proposal || !projectId || !documentId) {
      return;
    }

    const applied = applySelection({
      editor,
      selectionRef: proposal.selectionRef,
      replacementText: proposal.replacementText,
    });
    if (!applied.ok) {
      setError(applied.error);
      if (applied.error.code === "CONFLICT") {
        void logAiApplyConflict({ documentId, runId: proposal.runId });
      }
      return;
    }

    const json = JSON.stringify(editor.getJSON());
    await persistAiApply({
      projectId,
      documentId,
      contentJson: json,
      runId: proposal.runId,
    });
  }

  const selectedSkillName =
    skills.find((s) => s.id === selectedSkillId)?.name ?? selectedSkillId;

  return (
    <section
      data-testid="ai-panel"
      className="flex flex-col gap-3 p-3 min-h-0 relative"
    >
      <header className="flex items-center gap-2">
        <Text size="small" color="muted">AI</Text>
        <div className="ml-auto flex items-center gap-2">
          <Button
            data-testid="ai-context-toggle"
            variant="ghost"
            size="sm"
            onClick={() =>
              void toggleViewer({
                projectId: currentProject?.projectId ?? projectId ?? null,
                skillId: selectedSkillId ?? null,
                immediateInput: input,
              })
            }
            className={viewerOpen ? "bg-[var(--color-bg-base)]" : ""}
          >
            Context
          </Button>
          <Button
            data-testid="ai-skills-toggle"
            variant="ghost"
            size="sm"
            onClick={() => setSkillsOpen((v) => !v)}
            className="max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap"
            title={selectedSkillName}
          >
            {skillsStatus === "loading" ? "Skills…" : selectedSkillName}
          </Button>
          <Text data-testid="ai-status" size="tiny" color="muted">
            {status}
          </Text>
        </div>
      </header>

      <SkillPicker
        open={skillsOpen}
        items={skills}
        selectedSkillId={selectedSkillId}
        onOpenChange={setSkillsOpen}
        onSelectSkillId={(skillId) => {
          setSelectedSkillId(skillId);
          setSkillsOpen(false);
        }}
      />

      {applyStatus === "applied" ? (
        <Text data-testid="ai-apply-status" size="small" color="muted">
          Applied &amp; saved
        </Text>
      ) : null}

      {skillsLastError ? (
        <Card noPadding className="p-2.5">
          <Text size="code" color="muted">{skillsLastError.code}</Text>
          <Text size="small" color="muted" className="mt-1.5 block">
            {skillsLastError.message}
          </Text>
        </Card>
      ) : null}

      {lastError ? (
        <Card noPadding className="p-2.5">
          <div className="flex gap-2 items-center">
            <Text data-testid="ai-error-code" size="code" color="muted">
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

      <label className="flex items-center gap-2">
        <input
          data-testid="ai-stream-toggle"
          type="checkbox"
          checked={stream}
          onChange={(e) => setStream(e.target.checked)}
          disabled={isRunning(status)}
          className="h-4 w-4 accent-[var(--color-fg-default)]"
        />
        <Text size="small" color="muted">
          Stream
        </Text>
      </label>

      <Textarea
        data-testid="ai-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type E2E_DELAY / E2E_TIMEOUT / E2E_UPSTREAM_ERROR markers to drive fake server."
        fullWidth
        className="min-h-[92px]"
      />

      <div className="flex gap-2">
        <Button
          data-testid="ai-run"
          variant="secondary"
          size="md"
          onClick={() => void onRun()}
          disabled={isRunning(status)}
          className="flex-1"
        >
          Run
        </Button>
        <Button
          data-testid="ai-cancel"
          variant="ghost"
          size="md"
          onClick={() => void cancel()}
          disabled={!isRunning(status)}
        >
          Cancel
        </Button>
      </div>

      {viewerOpen ? <ContextViewer /> : null}

      <Card noPadding className="p-2.5 min-h-[120px] flex-1 overflow-auto">
        <pre
          data-testid="ai-output"
          className="m-0 whitespace-pre-wrap break-words text-xs leading-[18px] text-[var(--color-fg-base)] font-[var(--font-family-mono)]"
        >
          {outputText}
        </pre>
      </Card>

      {proposal ? (
        <>
          <DiffView diffText={diffText} />
          <div className="flex gap-2">
            <Button
              data-testid="ai-apply"
              variant="secondary"
              size="md"
              onClick={() => void onApply()}
              disabled={!canApply}
              className="flex-1"
            >
              Apply
            </Button>
            <Button
              data-testid="ai-reject"
              variant="ghost"
              size="md"
              onClick={onReject}
              disabled={applyStatus === "applying"}
            >
              Reject
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
