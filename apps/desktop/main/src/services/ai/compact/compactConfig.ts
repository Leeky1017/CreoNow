/**
 * @module compactConfig
 * ## Responsibilities: provide AutoCompact defaults and safe overrides.
 * ## Does not do: LLM invocation or message transformation.
 * ## Dependency direction: ai/compact -> ai/modelConfig(shared type only).
 * ## Invariants: INV-5, INV-10.
 */

import type { ResolvedModelConfig } from "../modelConfig";

const FALLBACK_CONTEXT_BUDGET = 128_000;

export interface CompactConfig {
  triggerThresholdPercent: number;
  preserveRecentRounds: number;
  maxConsecutiveFailures: number;
  contextBudget: number;
  summaryMaxTokens: number;
}

export interface CompactConfigOverrides {
  triggerThresholdPercent?: number;
  preserveRecentRounds?: number;
  maxConsecutiveFailures?: number;
  contextBudget?: number;
  summaryMaxTokens?: number;
}

export function resolveContextBudgetFromModelConfig(
  _modelConfig: ResolvedModelConfig,
): number {
  // Why: current model config only resolves model ids. Until runtime provides
  // per-model context windows, we keep a conservative default and allow caller
  // overrides for explicit budgets.
  return FALLBACK_CONTEXT_BUDGET;
}

export function createCompactConfig(args: {
  modelConfig: ResolvedModelConfig;
  overrides?: CompactConfigOverrides;
}): CompactConfig {
  const overrides = args.overrides ?? {};
  const resolvedBudget = resolveContextBudgetFromModelConfig(args.modelConfig);

  return {
    triggerThresholdPercent: overrides.triggerThresholdPercent ?? 0.85,
    preserveRecentRounds: overrides.preserveRecentRounds ?? 3,
    maxConsecutiveFailures: overrides.maxConsecutiveFailures ?? 3,
    contextBudget: overrides.contextBudget ?? resolvedBudget,
    summaryMaxTokens: overrides.summaryMaxTokens ?? 1_500,
  };
}
