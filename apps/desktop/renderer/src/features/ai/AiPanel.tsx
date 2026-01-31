import { useAiStore, type AiStatus } from "../../stores/aiStore";
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
  const input = useAiStore((s) => s.input);
  const outputText = useAiStore((s) => s.outputText);
  const lastError = useAiStore((s) => s.lastError);

  const setInput = useAiStore((s) => s.setInput);
  const setStream = useAiStore((s) => s.setStream);
  const clearError = useAiStore((s) => s.clearError);
  const run = useAiStore((s) => s.run);
  const cancel = useAiStore((s) => s.cancel);

  return (
    <section
      data-testid="ai-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 12,
        minHeight: 0,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>AI</div>
        <div
          data-testid="ai-status"
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--color-fg-muted)",
          }}
        >
          {status}
        </div>
      </header>

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
          onClick={() => void run()}
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
    </section>
  );
}
