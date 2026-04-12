/**
 * @module compactConfig
 * ## Responsibilities: provide AutoCompact defaults and safe overrides.
 * ## Does not do: LLM invocation or message transformation.
 * ## Dependency direction: ai/compact -> ai/modelConfig(shared type only).
 * ## Invariants: INV-5, INV-10.
 */

import type { ResolvedModelConfig } from "../modelConfig";

export const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000;

// Safe fallback matching the most common modern context window (GPT-4o class, 128K);
// used when neither primary nor auxiliary model appears in MODEL_CONTEXT_WINDOWS.
const FALLBACK_CONTEXT_BUDGET = 128_000;
const MODEL_CONTEXT_WINDOWS: Readonly<Record<string, number>> = {
  "gpt-4o": 128_000,
  "gpt-4o-mini": 128_000,
  "gpt-4.1": 1_000_000,
  "gpt-4.1-mini": 1_000_000,
  "gpt-4.1-nano": 1_000_000,
  "claude-3-5-sonnet": 200_000,
  "claude-3-7-sonnet": 200_000,
  "claude-sonnet-4": 200_000,
  "claude-sonnet-4.5": 200_000,
  "claude-sonnet-4.6": 200_000,
  "claude-opus-4.5": 200_000,
  "claude-opus-4.6": 200_000,
  "gemini-1.5-pro": 1_000_000,
  "gemini-1.5-flash": 1_000_000,
  "gemini-2.0-flash": 1_000_000,
};

export function resolveKnownContextWindow(modelId: string): number | null {
  const normalized = modelId.trim().toLowerCase();
  if (normalized.length === 0) {
    return null;
  }

  // Exact match first — avoids "gpt-4o" shadowing "gpt-4o-mini" via prefix.
  const exact = MODEL_CONTEXT_WINDOWS[normalized];
  if (exact !== undefined) {
    return exact;
  }

  // Prefix match sorted by descending key length so longer keys win.
  const sortedKeys = Object.keys(MODEL_CONTEXT_WINDOWS).sort(
    (a, b) => b.length - a.length,
  );
  for (const knownModelId of sortedKeys) {
    if (normalized.startsWith(`${knownModelId}-`)) {
      return MODEL_CONTEXT_WINDOWS[knownModelId]!;
    }
  }

  return null;
}

export interface CompactConfig {
  minTokenThreshold: number;
  triggerThresholdPercent: number;
  preserveRecentRounds: number;
  maxConsecutiveFailures: number;
  contextBudget: number;
  summaryMaxTokens: number;
  auxiliaryModel?: string;
}

export interface CompactConfigOverrides {
  minTokenThreshold?: number;
  triggerThresholdPercent?: number;
  preserveRecentRounds?: number;
  maxConsecutiveFailures?: number;
  contextBudget?: number;
  summaryMaxTokens?: number;
}

export function resolveContextBudgetFromModelConfig(
  modelConfig: ResolvedModelConfig,
): number {
  const primaryBudget = resolveKnownContextWindow(modelConfig.primaryModel);
  if (primaryBudget !== null) {
    return primaryBudget;
  }

  const auxiliaryBudget = resolveKnownContextWindow(modelConfig.auxiliaryModel);
  if (auxiliaryBudget !== null) {
    return auxiliaryBudget;
  }

  return FALLBACK_CONTEXT_BUDGET;
}

export function createCompactConfig(args: {
  modelConfig: ResolvedModelConfig;
  overrides?: CompactConfigOverrides;
}): CompactConfig {
  const overrides = args.overrides ?? {};
  const resolvedBudget = resolveContextBudgetFromModelConfig(args.modelConfig);

  return {
    minTokenThreshold: overrides.minTokenThreshold ?? 500, // Spec P2 shouldCompress floor: do not compact below 500 absolute tokens.
    triggerThresholdPercent: overrides.triggerThresholdPercent ?? 0.87, // Spec P2 trigger ratio: start compaction at 87% of context budget.
    preserveRecentRounds: overrides.preserveRecentRounds ?? 3, // Narrative safety default: keep ~3 recent rounds to preserve immediate writing intent.
    maxConsecutiveFailures: overrides.maxConsecutiveFailures ?? 3, // Spec circuit breaker: open after 3 consecutive compaction failures.
    contextBudget: overrides.contextBudget ?? resolvedBudget,
    summaryMaxTokens: overrides.summaryMaxTokens ?? 1_500, // Summary cap default: ~3-4 short narrative paragraphs without over-expanding context.
    auxiliaryModel: args.modelConfig.auxiliaryModel.trim() || undefined,
  };
}
