import { useContextStore } from "../../stores/contextStore";

type LayerDef = {
  id: "rules" | "settings" | "retrieved" | "immediate";
  label: string;
  testId: string;
};

const LAYERS: LayerDef[] = [
  { id: "rules", label: "Rules", testId: "ai-context-layer-rules" },
  { id: "settings", label: "Settings", testId: "ai-context-layer-settings" },
  { id: "retrieved", label: "Retrieved", testId: "ai-context-layer-retrieved" },
  { id: "immediate", label: "Immediate", testId: "ai-context-layer-immediate" },
];

/**
 * ContextViewer renders the assembled AI context with evidence and hashes.
 *
 * Why: CNWB-REQ-060 requires an inspectable, E2E-assertable UI surface for
 * context layers, trimming, and redaction (without leaking secrets/abs paths).
 */
export function ContextViewer(): JSX.Element {
  const status = useContextStore((s) => s.status);
  const assembled = useContextStore((s) => s.assembled);

  if (!assembled) {
    return (
      <section
        data-testid="ai-context-panel"
        style={{
          border: "1px solid var(--color-separator)",
          borderRadius: 8,
          padding: 10,
          background: "var(--color-bg-base)",
          color: "var(--color-fg-muted)",
          fontSize: 12,
        }}
      >
        <div>
          {status === "loading" ? "Loading context…" : "No context yet"}
        </div>
      </section>
    );
  }

  const trimmedOrErrored = assembled.trimEvidence.filter(
    (e) => e.action !== "kept" || e.reason === "read_error",
  );

  return (
    <section
      data-testid="ai-context-panel"
      style={{
        border: "1px solid var(--color-separator)",
        borderRadius: 8,
        padding: 10,
        background: "var(--color-bg-base)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 0,
      }}
    >
      <header style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
        <div style={{ fontSize: 12, color: "var(--color-fg-base)" }}>
          Context
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--color-fg-muted)",
          }}
        >
          {status}
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: "var(--color-fg-muted)" }}>
            stablePrefixHash
          </div>
          <div
            data-testid="ai-context-stable-prefix-hash"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
          >
            {assembled.hashes.stablePrefixHash}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--color-fg-muted)" }}>
            promptHash
          </div>
          <div
            data-testid="ai-context-prompt-hash"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
          >
            {assembled.hashes.promptHash}
          </div>
        </div>
      </div>

      <div
        style={{
          border: "1px solid var(--color-separator)",
          borderRadius: 8,
          padding: 10,
          background: "transparent",
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: "var(--color-fg-muted)" }}>
            rules
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            {assembled.budget.estimate.rulesTokens}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--color-fg-muted)" }}>
            settings
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            {assembled.budget.estimate.settingsTokens}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--color-fg-muted)" }}>
            retrieved
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            {assembled.budget.estimate.retrievedTokens}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--color-fg-muted)" }}>
            immediate
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            {assembled.budget.estimate.immediateTokens}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--color-fg-muted)" }}>
            total
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            {assembled.budget.estimate.totalTokens}/
            {assembled.budget.maxInputTokens}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          minHeight: 0,
        }}
      >
        {LAYERS.map((layer) => (
          <section key={layer.id} data-testid={layer.testId}>
            <div
              style={{
                fontSize: 11,
                color: "var(--color-fg-muted)",
                marginBottom: 6,
              }}
            >
              {layer.label}
            </div>
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 12,
                lineHeight: "18px",
                color: "var(--color-fg-base)",
                fontFamily: "var(--font-mono)",
                border: "1px solid var(--color-separator)",
                borderRadius: 8,
                padding: 10,
                background: "transparent",
                maxHeight: 180,
                overflow: "auto",
              }}
            >
              {assembled.layers[layer.id]}
            </pre>
          </section>
        ))}
      </div>

      <section data-testid="ai-context-trim">
        <div style={{ fontSize: 11, color: "var(--color-fg-muted)" }}>
          TrimEvidence ({trimmedOrErrored.length})
        </div>
        <div
          style={{
            marginTop: 6,
            border: "1px solid var(--color-separator)",
            borderRadius: 8,
            padding: 10,
            background: "transparent",
            maxHeight: 140,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-fg-muted)",
          }}
        >
          {trimmedOrErrored.length === 0 ? (
            <div>(none)</div>
          ) : (
            trimmedOrErrored.map((e, idx) => (
              <div key={`${e.layer}:${e.sourceRef}:${idx}`}>
                {e.layer} {e.action} {e.reason} {e.sourceRef} ({e.beforeChars}→
                {e.afterChars})
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <div style={{ fontSize: 11, color: "var(--color-fg-muted)" }}>
          RedactionEvidence ({assembled.redactionEvidence.length})
        </div>
        <div
          style={{
            marginTop: 6,
            border: "1px solid var(--color-separator)",
            borderRadius: 8,
            padding: 10,
            background: "transparent",
            maxHeight: 120,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-fg-muted)",
          }}
        >
          {assembled.redactionEvidence.length === 0 ? (
            <div>(none)</div>
          ) : (
            assembled.redactionEvidence.map((e, idx) => (
              <div key={`${e.patternId}:${e.sourceRef}:${idx}`}>
                {e.patternId} {e.matchCount} {e.sourceRef}
              </div>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
