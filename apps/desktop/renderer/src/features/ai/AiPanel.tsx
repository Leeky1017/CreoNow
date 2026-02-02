import React from "react";

import { Button, Spinner, Text } from "../../components/primitives";
import { useAiStore, type AiStatus } from "../../stores/aiStore";
import { useContextStore } from "../../stores/contextStore";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";
import { unifiedDiff } from "../../lib/diff/unifiedDiff";
import { DiffView } from "./DiffView";
import { applySelection, captureSelectionRef } from "./applySelection";
import { SkillPicker } from "./SkillPicker";
import { ChatHistory } from "./ChatHistory";
import { ModePicker, getModeName, type AiMode } from "./ModePicker";
import { ModelPicker, getModelName, type AiModel } from "./ModelPicker";
import { useAiStream } from "./useAiStream";

/**
 * Check if a given status represents an in-flight run.
 */
function isRunning(status: AiStatus): boolean {
  return status === "running" || status === "streaming";
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
  onClick?: () => void;
}): JSX.Element {
  return (
    <button
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

  const refreshContext = useContextStore((s) => s.refresh);

  const [activeTab, setActiveTab] = React.useState<"assistant" | "info">("assistant");
  const [skillsOpen, setSkillsOpen] = React.useState(false);
  const [modeOpen, setModeOpen] = React.useState(false);
  const [modelOpen, setModelOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [selectedMode, setSelectedMode] = React.useState<AiMode>("ask");
  const [selectedModel, setSelectedModel] = React.useState<AiModel>("gpt-5.2");
  const [lastRequest, setLastRequest] = React.useState<string | null>(null);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* History Dropdown */}
          <ChatHistory
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            onSelectChat={(chatId) => {
              // TODO: Load chat by ID
              console.log("Load chat:", chatId);
              setHistoryOpen(false);
            }}
          />
        </div>
      </header>

      {activeTab === "info" ? (
        <InfoPanel />
      ) : (
        <>
          {/* Main content area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
                  <span>{status === "streaming" ? "Generating..." : "Thinking..."}</span>
                </div>
              )}

              {/* Error Display */}
              {skillsLastError && (
                <div className="p-3 border border-[var(--color-error-subtle)] rounded-[var(--radius-md)] bg-[var(--color-bg-base)]">
                  <Text size="code" color="muted">{skillsLastError.code}</Text>
                  <Text size="small" color="muted" className="mt-1.5 block">
                    {skillsLastError.message}
                  </Text>
                </div>
              )}

              {lastError && (
                <div className="p-3 border border-[var(--color-error-subtle)] rounded-[var(--radius-md)] bg-[var(--color-bg-base)]">
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
                </div>
              )}

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
              ) : !lastRequest && !working && (
                <div
                  data-testid="ai-output"
                  className="flex-1 flex items-center justify-center text-center py-12"
                >
                  <Text size="small" color="muted">
                    Ask the AI to help with your writing
                  </Text>
                </div>
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
              <div className="border border-[var(--color-border-default)] rounded-[var(--radius-md)] bg-[var(--color-bg-base)] focus-within:border-[var(--color-border-focus)]">
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
                    {/* Mode button with picker */}
                    <div className="relative">
                      <ToolButton
                        active={modeOpen}
                        onClick={() => {
                          setModeOpen((v) => !v);
                          setModelOpen(false);
                          setSkillsOpen(false);
                        }}
                      >
                        {getModeName(selectedMode)}
                        <svg
                          className="inline-block ml-0.5 w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </ToolButton>
                      <ModePicker
                        open={modeOpen}
                        selectedMode={selectedMode}
                        onOpenChange={setModeOpen}
                        onSelectMode={(mode) => {
                          setSelectedMode(mode);
                          setModeOpen(false);
                        }}
                      />
                    </div>

                    {/* Model button with picker */}
                    <div className="relative">
                      <ToolButton
                        active={modelOpen}
                        onClick={() => {
                          setModelOpen((v) => !v);
                          setModeOpen(false);
                          setSkillsOpen(false);
                        }}
                      >
                        {getModelName(selectedModel)}
                        <svg
                          className="inline-block ml-0.5 w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </ToolButton>
                      <ModelPicker
                        open={modelOpen}
                        selectedModel={selectedModel}
                        onOpenChange={setModelOpen}
                        onSelectModel={(model) => {
                          setSelectedModel(model);
                          setModelOpen(false);
                        }}
                      />
                    </div>

                    {/* Skill button with picker */}
                    <div className="relative">
                      <ToolButton
                        active={skillsOpen}
                        onClick={() => {
                          setSkillsOpen((v) => !v);
                          setModeOpen(false);
                          setModelOpen(false);
                        }}
                      >
                        {skillsStatus === "loading" ? "Loading" : "SKILL"}
                        <svg
                          className="inline-block ml-0.5 w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </ToolButton>
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
                    </div>
                  </div>

                  <SendStopButton
                    isWorking={working}
                    disabled={!working && !input.trim()}
                    onSend={() => void onRun()}
                    onStop={() => void cancel()}
                  />
                </div>
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
