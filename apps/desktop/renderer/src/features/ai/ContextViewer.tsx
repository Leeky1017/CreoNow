import { Card } from "../../components/primitives/Card";
import { Text } from "../../components/primitives/Text";
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
      <Card
        data-testid="ai-context-panel"
        className="p-2.5 rounded-[var(--radius-md)]"
      >
        <Text size="small" color="muted">
          {status === "loading" ? "Loading context…" : "No context yet"}
        </Text>
      </Card>
    );
  }

  const trimmedOrErrored = assembled.trimEvidence.filter(
    (e) => e.action !== "kept" || e.reason === "read_error",
  );

  return (
    <Card
      data-testid="ai-context-panel"
      className="flex flex-col gap-2.5 p-2.5 rounded-[var(--radius-md)] min-h-0"
    >
      <header className="flex items-baseline gap-2.5">
        <Text size="small">Context</Text>
        <Text size="tiny" color="muted" className="ml-auto">
          {status}
        </Text>
      </header>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Text size="tiny" color="muted">
            stablePrefixHash
          </Text>
          <Text
            data-testid="ai-context-stable-prefix-hash"
            size="code"
            as="div"
            className="text-[11px]"
          >
            {assembled.hashes.stablePrefixHash}
          </Text>
        </div>
        <div>
          <Text size="tiny" color="muted">
            promptHash
          </Text>
          <Text
            data-testid="ai-context-prompt-hash"
            size="code"
            as="div"
            className="text-[11px]"
          >
            {assembled.hashes.promptHash}
          </Text>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2.5 p-2.5 border border-[var(--color-separator)] rounded-[var(--radius-md)]">
        <div>
          <Text size="tiny" color="muted">
            rules
          </Text>
          <Text size="code" as="div" className="text-[11px]">
            {assembled.budget.estimate.rulesTokens}
          </Text>
        </div>
        <div>
          <Text size="tiny" color="muted">
            settings
          </Text>
          <Text size="code" as="div" className="text-[11px]">
            {assembled.budget.estimate.settingsTokens}
          </Text>
        </div>
        <div>
          <Text size="tiny" color="muted">
            retrieved
          </Text>
          <Text size="code" as="div" className="text-[11px]">
            {assembled.budget.estimate.retrievedTokens}
          </Text>
        </div>
        <div>
          <Text size="tiny" color="muted">
            immediate
          </Text>
          <Text size="code" as="div" className="text-[11px]">
            {assembled.budget.estimate.immediateTokens}
          </Text>
        </div>
        <div>
          <Text size="tiny" color="muted">
            total
          </Text>
          <Text size="code" as="div" className="text-[11px]">
            {assembled.budget.estimate.totalTokens}/
            {assembled.budget.maxInputTokens}
          </Text>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 min-h-0">
        {LAYERS.map((layer) => (
          <section key={layer.id} data-testid={layer.testId}>
            <Text size="tiny" color="muted" as="div" className="mb-1.5">
              {layer.label}
            </Text>
            <pre className="m-0 whitespace-pre-wrap break-words text-xs leading-[18px] text-[var(--color-fg-base)] font-[var(--font-family-mono)] border border-[var(--color-separator)] rounded-[var(--radius-md)] p-2.5 bg-transparent max-h-[180px] overflow-auto">
              {assembled.layers[layer.id]}
            </pre>
          </section>
        ))}
      </div>

      <section data-testid="ai-context-trim">
        <Text size="tiny" color="muted">
          TrimEvidence ({trimmedOrErrored.length})
        </Text>
        <div className="mt-1.5 border border-[var(--color-separator)] rounded-[var(--radius-md)] p-2.5 bg-transparent max-h-[140px] overflow-auto flex flex-col gap-1.5 font-[var(--font-family-mono)] text-[11px] text-[var(--color-fg-muted)]">
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
        <Text size="tiny" color="muted">
          RedactionEvidence ({assembled.redactionEvidence.length})
        </Text>
        <div className="mt-1.5 border border-[var(--color-separator)] rounded-[var(--radius-md)] p-2.5 bg-transparent max-h-[120px] overflow-auto flex flex-col gap-1.5 font-[var(--font-family-mono)] text-[11px] text-[var(--color-fg-muted)]">
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
    </Card>
  );
}
