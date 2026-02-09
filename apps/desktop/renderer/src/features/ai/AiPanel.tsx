import React from "react";

import {
  AiErrorCard,
  type AiErrorConfig,
} from "../../components/features/AiDialogs";

import { Button, Spinner, Text } from "../../components/primitives";

import { useOpenSettings } from "../../components/layout/RightPanel";

import { useAiStore, type AiStatus } from "../../stores/aiStore";

import { useEditorStore } from "../../stores/editorStore";

import { useProjectStore } from "../../stores/projectStore";

import { unifiedDiff } from "../../lib/diff/unifiedDiff";

import { invoke } from "../../lib/ipcClient";

import { DiffView } from "../diff/DiffView";

import { applySelection, captureSelectionRef } from "./applySelection";

import { SkillPicker } from "./SkillPicker";

import { ChatHistory } from "./ChatHistory";

import { ModePicker, getModeName, type AiMode } from "./ModePicker";

import {
  ModelPicker,
  getModelName,
  type AiModel,
  type AiModelOption,
} from "./ModelPicker";
import { useAiStream } from "./useAiStream";
import { onAiModelCatalogUpdated } from "./modelCatalogEvents";

const RECENT_MODELS_STORAGE_KEY = "creonow.ai.recentModels";

/**

 * Check if a given status represents an in-flight run.

 */

function isRunning(status: AiStatus): boolean {
  return status === "running" || status === "streaming";
}

type DbErrorDetails = {
  category?: string;
  remediation?: {
    command?: string;
    restartRequired?: boolean;
  };
};

/**
 * Build actionable DB remediation text for AI panel errors.
 *
 * Why: users need a concrete recovery command when native DB bindings fail.
 */
export function formatDbErrorDescription(args: {
  message: string;
  details?: unknown;
}): string {
  const raw = args.details;
  if (!raw || typeof raw !== "object") {
    return args.message;
  }

  const details = raw as DbErrorDetails;
  const command = details.remediation?.command?.trim();
  if (!command) {
    return args.message;
  }

  const restartSuffix = details.remediation?.restartRequired
    ? " Then restart the app."
    : "";
  return `${args.message}\nFix: run \`${command}\`.${restartSuffix}`;
}

/**

 * SendStopButton - Combined send/stop button

 *

 * - Idle: Arrow up icon (send)

 * - Working: Circle with square icon (stop)

 */

function SendStopButton(props: {
  isWorking: boolean;

  disabled?: boolean;

  onSend: () => void;

  onStop: () => void;
}): JSX.Element {
  return (
    <button
      data-testid="ai-send-stop"
      type="button"
      className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={props.isWorking ? props.onStop : props.onSend}
      disabled={props.disabled}
      title={props.isWorking ? "Stop generating" : "Send message"}
    >
      {props.isWorking ? (
        // Stop icon: circle with square

        <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center">
          <div className="w-2 h-2 bg-current rounded-[1px]" />
        </div>
      ) : (
        // Send icon: arrow up

        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="19" x2="12" y2="5" />

          <polyline points="5 12 12 5 19 12" />
        </svg>
      )}
    </button>
  );
}

/**

 * ToolButton - Small button for input toolbar

 */

function ToolButton(props: {
  children: React.ReactNode;
  active?: boolean;
  testId?: string;
  onClick?: () => void;
}): JSX.Element {
  return (
    <button
      data-testid={props.testId}
      type="button"
      className={`
        px-1.5 py-0.5 text-[11px] font-medium rounded-[var(--radius-sm)]
        transition-colors cursor-pointer
        ${
          props.active
            ? "text-[var(--color-fg-default)] bg-[var(--color-bg-selected)]"
            : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-hover)]"
        }
      `}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

/**

 * CodeBlock - Renders a code block with Copy and Apply buttons

 * Exported for use in AI response rendering

 */

export function CodeBlock(props: {
  language?: string;

  code: string;

  onCopy?: () => void;

  onApply?: () => void;
}): JSX.Element {
  const [copied, setCopied] = React.useState(false);

  function handleCopy(): void {
    void navigator.clipboard.writeText(props.code);

    setCopied(true);

    setTimeout(() => setCopied(false), 2000);

    props.onCopy?.();
  }

  return (
    <div className="my-3 border border-[var(--color-border-default)] rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-base)]">
      {/* Header */}

      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-bg-raised)] border-b border-[var(--color-border-default)]">
        <span className="text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wide">
          {props.language || "code"}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="px-2 py-0.5 text-[11px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-hover)] rounded transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>

          {props.onApply && (
            <button
              type="button"
              onClick={props.onApply}
              className="px-2 py-0.5 text-[11px] text-[var(--color-fg-accent)] hover:bg-[var(--color-bg-hover)] rounded transition-colors"
            >
              Apply
            </button>
          )}
        </div>
      </div>

      {/* Code content */}

      <pre className="m-0 p-3 overflow-x-auto text-[12px] leading-[1.6] text-[var(--color-fg-default)] font-[var(--font-family-mono)]">
        <code>{props.code}</code>
      </pre>
    </div>
  );
}

/**

 * InfoPanel placeholder - shown when Info tab is selected

 */

function InfoPanel(): JSX.Element {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Text size="small" color="muted" className="text-center">
        Project and document info will appear here
      </Text>
    </div>
  );
}

/**

 * AiPanel provides the AI assistant interface for text generation and editing.

 *

 * Layout:

 * - Header with Tabs (Assistant / Info)

 * - User Request Card (shows current input)

 * - AI Response Area with streaming cursor

 * - Action Area (Apply/Reject when proposal exists)

 * - Input Area with embedded toolbar and send/stop button

 */

export function AiPanel(): JSX.Element {
  useAiStream();

  const openSettings = useOpenSettings();

  const status = useAiStore((s) => s.status);

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

  const [activeTab, setActiveTab] = React.useState<"assistant" | "info">(
    "assistant",
  );

  const [skillsOpen, setSkillsOpen] = React.useState(false);

  const [modeOpen, setModeOpen] = React.useState(false);

  const [modelOpen, setModelOpen] = React.useState(false);

  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [selectedMode, setSelectedMode] = React.useState<AiMode>("ask");
  const [selectedModel, setSelectedModel] = React.useState<AiModel>("gpt-5.2");
  const [recentModelIds, setRecentModelIds] = React.useState<string[]>([]);
  const [availableModels, setAvailableModels] = React.useState<AiModelOption[]>(
    [],
  );
  const [modelsStatus, setModelsStatus] = React.useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  const [modelsLastError, setModelsLastError] = React.useState<string | null>(
    null,
  );

  const [lastRequest, setLastRequest] = React.useState<string | null>(null);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const refreshModels = React.useCallback(async () => {
    setModelsStatus("loading");

    setModelsLastError(null);

    const res = await invoke("ai:models:list", {});

    if (!res.ok) {
      setModelsStatus("error");

      setModelsLastError(`${res.error.code}: ${res.error.message}`);

      return;
    }

    setAvailableModels(res.data.items);

    setModelsStatus("ready");

    if (res.data.items.length === 0) {
      return;
    }

    const selectedExists = res.data.items.some(
      (item) => item.id === selectedModel,
    );

    if (!selectedExists) {
      setSelectedModel(res.data.items[0].id);
    }
  }, [selectedModel]);

  React.useEffect(() => {
    void refreshSkills();
    void refreshModels();
  }, [refreshModels, refreshSkills]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_MODELS_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return;
      }
      const items = parsed
        .filter((item): item is string => typeof item === "string")
        .slice(0, 8);
      setRecentModelIds(items);
    } catch {
      return;
    }
  }, []);

  React.useEffect(() => {
    if (selectedModel.trim().length === 0) {
      return;
    }
    setRecentModelIds((prev) => {
      const next = [
        selectedModel,
        ...prev.filter((id) => id !== selectedModel),
      ].slice(0, 8);
      window.localStorage.setItem(
        RECENT_MODELS_STORAGE_KEY,
        JSON.stringify(next),
      );
      return next;
    });
  }, [selectedModel]);

  React.useEffect(() => {
    return onAiModelCatalogUpdated(() => {
      void refreshModels();
    });
  }, [refreshModels]);

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

   * Run the selected skill with current input.

   */

  async function onRun(): Promise<void> {
    if (!input.trim()) return;

    setLastRequest(input);

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

    await run({
      context: {
        projectId: currentProject?.projectId ?? projectId ?? undefined,
        documentId: documentId ?? undefined,
      },
      mode: selectedMode,
      model: selectedModel,
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    // Enter to send (without Shift)

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      if (!isRunning(status) && input.trim()) {
        void onRun();
      }
    }
  }

  /**

   * Start a new chat: clear current conversation and focus input.

   */

  function handleNewChat(): void {
    setLastRequest(null);

    setInput("");

    setProposal(null);

    setError(null);

    textareaRef.current?.focus();
  }

  const working = isRunning(status);

  const skillsErrorConfig: AiErrorConfig | null = skillsLastError
    ? {
        type: "service_error",

        title: "Skills unavailable",
        description:
          skillsLastError.code === "DB_ERROR"
            ? formatDbErrorDescription({
                message: skillsLastError.message,
                details: skillsLastError.details,
              })
            : skillsLastError.message,
        errorCode: skillsLastError.code,
      }
    : null;

  const modelsErrorConfig: AiErrorConfig | null = modelsLastError
    ? {
        type: "service_error",

        title: "Models unavailable",

        description: modelsLastError,

        errorCode: "UPSTREAM_ERROR",
      }
    : null;

  const runtimeErrorConfig: AiErrorConfig | null = lastError
    ? {
        type:
          lastError.code === "TIMEOUT"
            ? "timeout"
            : lastError.code === "RATE_LIMITED" ||
                lastError.code === "AI_RATE_LIMITED"
              ? "rate_limit"
              : "service_error",

        title:
          lastError.code === "TIMEOUT"
            ? "Timeout"
            : lastError.code === "RATE_LIMITED" ||
                lastError.code === "AI_RATE_LIMITED"
              ? "Rate limited"
              : "AI error",

        description:
          lastError.code === "DB_ERROR"
            ? formatDbErrorDescription({
                message: lastError.message,
                details: lastError.details,
              })
            : lastError.message,

        errorCode: lastError.code,
      }
    : null;

  return (
    <section
      data-testid="ai-panel"
      className="flex flex-col h-full min-h-0 bg-[var(--color-bg-surface)]"
    >
      {/* Header with Tabs */}

      <header className="flex items-center h-8 px-2 border-b border-[var(--color-separator)] shrink-0">
        <div className="flex items-center gap-3 h-full">
          <button
            type="button"
            className={`

              h-full text-[10px] font-semibold uppercase tracking-wide

              border-b transition-colors

              ${
                activeTab === "assistant"
                  ? "text-[var(--color-fg-default)] border-[var(--color-accent)]"
                  : "text-[var(--color-fg-muted)] border-transparent hover:text-[var(--color-fg-default)]"
              }

            `}
            onClick={() => setActiveTab("assistant")}
          >
            Assistant
          </button>

          <button
            type="button"
            className={`

              h-full text-[10px] font-semibold uppercase tracking-wide

              border-b transition-colors

              ${
                activeTab === "info"
                  ? "text-[var(--color-fg-default)] border-[var(--color-accent)]"
                  : "text-[var(--color-fg-muted)] border-transparent hover:text-[var(--color-fg-default)]"
              }

            `}
            onClick={() => setActiveTab("info")}
          >
            Info
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1 relative">
          {/* History button */}

          <button
            data-testid="ai-history-toggle"
            type="button"
            title="History"
            onClick={() => setHistoryOpen((v) => !v)}
            className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
              historyOpen
                ? "text-[var(--color-fg-default)] bg-[var(--color-bg-selected)]"
                : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]"
            }`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />

              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>

          {/* New Chat button */}

          <button
            data-testid="ai-new-chat"
            type="button"
            title="New Chat"
            onClick={handleNewChat}
            className="w-5 h-5 flex items-center justify-center text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] rounded transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />

              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* History Dropdown */}

          <ChatHistory
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            onSelectChat={(chatId) => {
              // History feature: select a chat by ID

              // Currently shows a placeholder UI; full implementation is P1 scope

              setHistoryOpen(false);

              // Optionally show a toast or notification that this feature is coming

              void chatId; // Acknowledge the parameter for type checking
            }}
          />
        </div>
      </header>

      {activeTab === "info" ? (
        <InfoPanel />
      ) : (
        <>
          {/* Main content area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* User Request - boxed */}
              {lastRequest && (
                <div className="w-full p-3 border border-[var(--color-border-default)] rounded-[var(--radius-md)] bg-[var(--color-bg-base)]">
                  <div className="text-[13px] text-[var(--color-fg-default)] whitespace-pre-wrap">
                    {lastRequest}
                  </div>
                </div>
              )}

              {/* Status indicator */}
              {working && (
                <div className="flex items-center gap-2 text-[12px] text-[var(--color-fg-muted)]">
                  <Spinner size="sm" />
                  <span>
                    {status === "streaming" ? "Generating..." : "Thinking..."}
                  </span>
                </div>
              )}

              {/* Error Display */}
              {skillsErrorConfig ? (
                <AiErrorCard error={skillsErrorConfig} showDismiss={false} />
              ) : null}

              {modelsErrorConfig ? (
                <AiErrorCard error={modelsErrorConfig} showDismiss={false} />
              ) : null}

              {runtimeErrorConfig ? (
                <AiErrorCard
                  error={runtimeErrorConfig}
                  errorCodeTestId="ai-error-code"
                  onDismiss={clearError}
                />
              ) : null}

              {/* AI Response - no box, just text flow */}
              {outputText ? (
                <div data-testid="ai-output" className="w-full">
                  <div className="text-[13px] leading-relaxed text-[var(--color-fg-default)] whitespace-pre-wrap">
                    {outputText}
                    {status === "streaming" && (
                      <span className="typing-cursor" />
                    )}
                  </div>
                </div>
              ) : (
                !lastRequest &&
                !working && (
                  <div
                    data-testid="ai-output"
                    className="flex-1 flex items-center justify-center text-center py-12"
                  >
                    <Text size="small" color="muted">
                      Ask the AI to help with your writing
                    </Text>
                  </div>
                )
              )}

              {/* Applied Status */}
              {applyStatus === "applied" && (
                <Text data-testid="ai-apply-status" size="small" color="muted">
                  Applied &amp; saved
                </Text>
              )}

              {/* Proposal Area (Diff + Apply/Reject) */}
              {proposal && (
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
              )}
            </div>

            {/* Input Area - Fixed at bottom, minimal padding like Cursor */}
            <div className="shrink-0 px-1.5 pb-1.5 pt-2 border-t border-[var(--color-separator)]">
              {/* Unified input wrapper */}
              <div className="relative border border-[var(--color-border-default)] rounded-[var(--radius-md)] bg-[var(--color-bg-base)] focus-within:border-[var(--color-border-focus)]">
                <textarea
                  ref={textareaRef}
                  data-testid="ai-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask the AI to help with your writing..."
                  className="w-full min-h-[60px] max-h-[160px] px-3 py-2 bg-transparent border-none resize-none text-[13px] text-[var(--color-fg-default)] placeholder:text-[var(--color-fg-placeholder)] focus:outline-none"
                />

                {/* Embedded toolbar - seamless, no separator */}
                <div className="flex items-center justify-between px-2 pb-2">
                  <div className="flex items-center gap-1">
                    {/* Mode button */}
                    <ToolButton
                      active={modeOpen}
                      onClick={() => {
                        setModeOpen((v) => !v);
                        setModelOpen(false);
                        setSkillsOpen(false);
                      }}
                    >
                      {getModeName(selectedMode)}
                    </ToolButton>

                    {/* Model button */}
                    <ToolButton
                      active={modelOpen}
                      onClick={() => {
                        setModelOpen((v) => !v);
                        setModeOpen(false);
                        setSkillsOpen(false);
                      }}
                    >
                      {modelsStatus === "loading"
                        ? "Loading"
                        : getModelName(selectedModel, availableModels)}
                    </ToolButton>

                    {/* Skill button */}
                    <ToolButton
                      active={skillsOpen}
                      testId="ai-skills-toggle"
                      onClick={() => {
                        setSkillsOpen((v) => !v);
                        setModeOpen(false);
                        setModelOpen(false);
                      }}
                    >
                      {skillsStatus === "loading" ? "Loading" : "SKILL"}
                    </ToolButton>
                  </div>

                  <SendStopButton
                    isWorking={working}
                    disabled={!working && !input.trim()}
                    onSend={() => void onRun()}
                    onStop={() => void cancel()}
                  />
                </div>

                {/* Pickers anchored to the input wrapper */}
                <ModePicker
                  open={modeOpen}
                  selectedMode={selectedMode}
                  onOpenChange={setModeOpen}
                  onSelectMode={(mode) => {
                    setSelectedMode(mode);
                    setModeOpen(false);
                  }}
                />
                <ModelPicker
                  open={modelOpen}
                  models={availableModels}
                  recentModelIds={recentModelIds}
                  selectedModel={selectedModel}
                  onOpenChange={setModelOpen}
                  onSelectModel={(model) => {
                    setSelectedModel(model);
                    setModelOpen(false);
                  }}
                />
                <SkillPicker
                  open={skillsOpen}
                  items={skills}
                  selectedSkillId={selectedSkillId}
                  onOpenChange={setSkillsOpen}
                  onSelectSkillId={(skillId) => {
                    setSelectedSkillId(skillId);
                    setSkillsOpen(false);
                  }}
                  onOpenSettings={() => {
                    setSkillsOpen(false);
                    openSettings();
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* CSS for typing cursor animation */}

      <style>{`

        .typing-cursor::after {

          content: '';

          display: inline-block;

          width: 6px;

          height: 14px;

          background-color: var(--color-fg-default);

          margin-left: 2px;

          vertical-align: text-bottom;

          animation: blink 1s step-end infinite;

        }



        @keyframes blink {

          0%, 100% { opacity: 1; }

          50% { opacity: 0; }

        }

      `}</style>
    </section>
  );
}
