import React from "react";

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
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 12,
        minHeight: 0,
        position: "relative",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>AI</div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <button
            data-testid="ai-context-toggle"
            type="button"
            onClick={() =>
              void toggleViewer({
                projectId: currentProject?.projectId ?? projectId ?? null,
                skillId: selectedSkillId ?? null,
                immediateInput: input,
              })
            }
            style={{
              border: "1px solid var(--color-separator)",
              background: viewerOpen ? "var(--color-bg-base)" : "transparent",
              color: "var(--color-fg-muted)",
              borderRadius: 8,
              padding: "4px 8px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Context
          </button>
          <button
            data-testid="ai-skills-toggle"
            type="button"
            onClick={() => setSkillsOpen((v) => !v)}
            style={{
              border: "1px solid var(--color-separator)",
              background: "transparent",
              color: "var(--color-fg-muted)",
              borderRadius: 8,
              padding: "4px 8px",
              fontSize: 12,
              cursor: "pointer",
              maxWidth: 220,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={selectedSkillName}
          >
            {skillsStatus === "loading" ? "Skills…" : selectedSkillName}
          </button>
          <div
            data-testid="ai-status"
            style={{
              fontSize: 11,
              color: "var(--color-fg-muted)",
            }}
          >
            {status}
          </div>
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
        <div
          data-testid="ai-apply-status"
          style={{ fontSize: 12, color: "var(--color-fg-muted)" }}
        >
          Applied &amp; saved
        </div>
      ) : null}

      {skillsLastError ? (
        <div
          style={{
            border: "1px solid var(--color-separator)",
            borderRadius: 8,
            padding: 10,
            background: "var(--color-bg-base)",
            color: "var(--color-fg-muted)",
            fontSize: 12,
          }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            {skillsLastError.code}
          </div>
          <div style={{ marginTop: 6 }}>{skillsLastError.message}</div>
        </div>
      ) : null}

      {lastError ? (
        <div
          style={{
            border: "1px solid var(--color-separator)",
            borderRadius: 8,
            padding: 10,
            background: "var(--color-bg-base)",
            color: "var(--color-fg-muted)",
            fontSize: 12,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div
              data-testid="ai-error-code"
              style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
            >
              {lastError.code}
            </div>
            <button
              type="button"
              onClick={clearError}
              style={{
                marginLeft: "auto",
                border: "1px solid var(--color-separator)",
                background: "transparent",
                color: "var(--color-fg-muted)",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
          </div>
          <div style={{ marginTop: 6 }}>{lastError.message}</div>
        </div>
      ) : null}

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          data-testid="ai-stream-toggle"
          type="checkbox"
          checked={stream}
          onChange={(e) => setStream(e.target.checked)}
          disabled={isRunning(status)}
        />
        <span style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
          Stream
        </span>
      </label>

      <textarea
        data-testid="ai-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type E2E_DELAY / E2E_TIMEOUT / E2E_UPSTREAM_ERROR markers to drive fake server."
        style={{
          width: "100%",
          minHeight: 92,
          resize: "vertical",
          border: "1px solid var(--color-separator)",
          borderRadius: 8,
          padding: 10,
          background: "var(--color-bg-base)",
          color: "var(--color-fg-base)",
          outline: "none",
          fontSize: 12,
          lineHeight: "18px",
        }}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button
          data-testid="ai-run"
          type="button"
          onClick={() => void onRun()}
          disabled={isRunning(status)}
          style={{
            border: "1px solid var(--color-separator)",
            background: "var(--color-bg-base)",
            color: "var(--color-fg-base)",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            cursor: isRunning(status) ? "not-allowed" : "pointer",
            flex: 1,
          }}
        >
          Run
        </button>
        <button
          data-testid="ai-cancel"
          type="button"
          onClick={() => void cancel()}
          disabled={!isRunning(status)}
          style={{
            border: "1px solid var(--color-separator)",
            background: "transparent",
            color: "var(--color-fg-muted)",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            cursor: !isRunning(status) ? "not-allowed" : "pointer",
          }}
        >
          Cancel
        </button>
      </div>

      {viewerOpen ? <ContextViewer /> : null}

      <div
        style={{
          border: "1px solid var(--color-separator)",
          borderRadius: 8,
          background: "var(--color-bg-base)",
          padding: 10,
          minHeight: 120,
          flex: 1,
          overflow: "auto",
        }}
      >
        <pre
          data-testid="ai-output"
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: 12,
            lineHeight: "18px",
            color: "var(--color-fg-base)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {outputText}
        </pre>
      </div>

      {proposal ? (
        <>
          <DiffView diffText={diffText} />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              data-testid="ai-apply"
              type="button"
              onClick={() => void onApply()}
              disabled={!canApply}
              style={{
                border: "1px solid var(--color-separator)",
                background: "var(--color-bg-base)",
                color: "var(--color-fg-base)",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 12,
                cursor: !canApply ? "not-allowed" : "pointer",
                flex: 1,
              }}
            >
              Apply
            </button>
            <button
              data-testid="ai-reject"
              type="button"
              onClick={onReject}
              disabled={applyStatus === "applying"}
              style={{
                border: "1px solid var(--color-separator)",
                background: "transparent",
                color: "var(--color-fg-muted)",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 12,
                cursor: applyStatus === "applying" ? "not-allowed" : "pointer",
              }}
            >
              Reject
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
