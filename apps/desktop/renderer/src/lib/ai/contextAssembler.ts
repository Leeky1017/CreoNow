import type { RedactionEvidenceItem } from "../redaction/redact";

export type ContextLayerId = "rules" | "settings" | "retrieved" | "immediate";

export type ContextBudget = {
  maxInputTokens: number;
  estimate: {
    rulesTokens: number;
    settingsTokens: number;
    retrievedTokens: number;
    immediateTokens: number;
    totalTokens: number;
  };
};

export type TrimEvidenceItem = {
  layer: ContextLayerId;
  sourceRef: string;
  action: "kept" | "trimmed" | "dropped";
  reason: "over_budget" | "too_large" | "invalid_format" | "read_error";
  beforeChars: number;
  afterChars: number;
};

export type ContextHashes = {
  stablePrefixHash: string;
  promptHash: string;
};

export type ContextLayerSources = Array<{
  sourceRef: string;
  text: string;
}>;

export type AssembledContext = {
  layers: Record<ContextLayerId, string>;
  systemPrompt: string;
  userContent: string;
  promptText: string;
  hashes: ContextHashes;
  budget: ContextBudget;
  trimEvidence: TrimEvidenceItem[];
  redactionEvidence: RedactionEvidenceItem[];
};

/**
 * Compute an FNV-1a 32-bit hash in hex.
 *
 * Why: stablePrefixHash must be deterministic across platforms/Unicode inputs.
 */
function fnv1a32Hex(text: string): string {
  const data = new TextEncoder().encode(text);
  let hash = 0x811c9dc5;
  for (const byte of data) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * Estimate token count from UTF-8 bytes.
 *
 * Why: V1 avoids tokenizer deps; byte-based estimate is stable and cheap.
 */
function estimateTokens(text: string): number {
  const bytes = new TextEncoder().encode(text).length;
  return Math.ceil(bytes / 4);
}

/**
 * Render sources into a stable, human-readable layer string.
 *
 * Why: Context Viewer needs deterministic formatting for E2E assertions.
 */
function buildLayerText(args: {
  sources: ContextLayerSources;
  emptyLabel: string;
}): string {
  if (args.sources.length === 0) {
    return `${args.emptyLabel}\n`;
  }

  const out: string[] = [];
  for (const s of args.sources) {
    out.push(`### ${s.sourceRef}`);
    out.push(s.text.trimEnd());
    out.push("");
  }
  return `${out.join("\n").trimEnd()}\n`;
}

/**
 * Trim sources sequentially to a fixed token budget (deterministic).
 *
 * Why: stablePrefixHash must not depend on dynamic layer sizes; each layer gets
 * an independent budget and produces per-source TrimEvidence.
 */
function trimSourcesToTokenBudget(args: {
  layer: ContextLayerId;
  sources: ContextLayerSources;
  tokenBudget: number;
}): {
  sources: ContextLayerSources;
  evidence: TrimEvidenceItem[];
} {
  const maxBytes = Math.max(0, Math.floor(args.tokenBudget * 4));
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let remaining = maxBytes;
  const trimmed: ContextLayerSources = [];
  const evidence: TrimEvidenceItem[] = [];

  for (const src of args.sources) {
    const bytes = encoder.encode(src.text);
    const beforeChars = src.text.length;

    if (remaining <= 0) {
      evidence.push({
        layer: args.layer,
        sourceRef: src.sourceRef,
        action: "dropped",
        reason: "over_budget",
        beforeChars,
        afterChars: 0,
      });
      continue;
    }

    if (bytes.length <= remaining) {
      trimmed.push(src);
      evidence.push({
        layer: args.layer,
        sourceRef: src.sourceRef,
        action: "kept",
        reason: "over_budget",
        beforeChars,
        afterChars: beforeChars,
      });
      remaining -= bytes.length;
      continue;
    }

    const sliced = bytes.slice(0, remaining);
    const text = decoder.decode(sliced);
    trimmed.push({ sourceRef: src.sourceRef, text });
    evidence.push({
      layer: args.layer,
      sourceRef: src.sourceRef,
      action: "trimmed",
      reason: "over_budget",
      beforeChars,
      afterChars: text.length,
    });
    remaining = 0;
  }

  return { sources: trimmed, evidence };
}

/**
 * Derive fixed per-layer budgets from a single max input budget.
 *
 * Why: budgets must sum to maxInputTokens and remain stable across runs.
 */
function deriveLayerBudgets(maxInputTokens: number): Record<ContextLayerId, number> {
  const total = Math.max(0, Math.floor(maxInputTokens));

  const rulesTokens = Math.floor(total * 0.3);
  const settingsTokens = Math.floor(total * 0.3);
  const retrievedTokens = Math.floor(total * 0.25);
  const used = rulesTokens + settingsTokens + retrievedTokens;
  const immediateTokens = Math.max(0, total - used);

  return {
    rules: rulesTokens,
    settings: settingsTokens,
    retrieved: retrievedTokens,
    immediate: immediateTokens,
  };
}

/**
 * Assemble deterministic CN context layers, budgets, and hashes.
 *
 * Why: CNWB-REQ-060 requires stable prefix hashing, trimming evidence, and an
 * inspectable viewer surface that stays deterministic across runs.
 */
export function assembleContext(args: {
  rules: ContextLayerSources;
  settings: ContextLayerSources;
  retrieved: ContextLayerSources;
  immediate: ContextLayerSources;
  maxInputTokens: number;
  redactionEvidence: RedactionEvidenceItem[];
}): AssembledContext {
  const budgets = deriveLayerBudgets(args.maxInputTokens);

  const rulesTrimmed = trimSourcesToTokenBudget({
    layer: "rules",
    sources: args.rules,
    tokenBudget: budgets.rules,
  });
  const settingsTrimmed = trimSourcesToTokenBudget({
    layer: "settings",
    sources: args.settings,
    tokenBudget: budgets.settings,
  });
  const retrievedTrimmed = trimSourcesToTokenBudget({
    layer: "retrieved",
    sources: args.retrieved,
    tokenBudget: budgets.retrieved,
  });
  const immediateTrimmed = trimSourcesToTokenBudget({
    layer: "immediate",
    sources: args.immediate,
    tokenBudget: budgets.immediate,
  });

  const layers: Record<ContextLayerId, string> = {
    rules: buildLayerText({ sources: rulesTrimmed.sources, emptyLabel: "(none)" }),
    settings: buildLayerText({
      sources: settingsTrimmed.sources,
      emptyLabel: "(none)",
    }),
    retrieved: buildLayerText({
      sources: retrievedTrimmed.sources,
      emptyLabel: "(none)",
    }),
    immediate: buildLayerText({
      sources: immediateTrimmed.sources,
      emptyLabel: "(none)",
    }),
  };

  const systemPrompt = [
    "# CreoNow Context (v1)",
    "",
    "## Rules",
    layers.rules.trimEnd(),
    "",
    "## Settings",
    layers.settings.trimEnd(),
    "",
    "## Dynamic",
    "Retrieved + Immediate are provided in user content.",
    "",
  ].join("\n");

  const userContent = [
    "## Retrieved",
    layers.retrieved.trimEnd(),
    "",
    "## Immediate",
    layers.immediate.trimEnd(),
    "",
  ].join("\n");

  const promptText = `${systemPrompt}\n${userContent}`.trimEnd() + "\n";

  const hashes: ContextHashes = {
    stablePrefixHash: fnv1a32Hex(systemPrompt),
    promptHash: fnv1a32Hex(promptText),
  };

  const budget: ContextBudget = {
    maxInputTokens: args.maxInputTokens,
    estimate: {
      rulesTokens: estimateTokens(layers.rules),
      settingsTokens: estimateTokens(layers.settings),
      retrievedTokens: estimateTokens(layers.retrieved),
      immediateTokens: estimateTokens(layers.immediate),
      totalTokens:
        estimateTokens(layers.rules) +
        estimateTokens(layers.settings) +
        estimateTokens(layers.retrieved) +
        estimateTokens(layers.immediate),
    },
  };

  return {
    layers,
    systemPrompt,
    userContent,
    promptText,
    hashes,
    budget,
    trimEvidence: [
      ...rulesTrimmed.evidence,
      ...settingsTrimmed.evidence,
      ...retrievedTrimmed.evidence,
      ...immediateTrimmed.evidence,
    ],
    redactionEvidence: args.redactionEvidence,
  };
}
