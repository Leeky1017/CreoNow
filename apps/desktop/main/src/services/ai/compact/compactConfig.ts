/**
 * @module compactConfig
 * ## Responsibilities: provide AutoCompact defaults and safe overrides.
 * ## Does not do: LLM invocation or message transformation.
 * ## Dependency direction: ai/compact -> ai/modelConfig(shared type only).
 * ## Invariants: INV-5, INV-10.
 */

import type { ResolvedModelConfig } from "../modelConfig";

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

function resolveKnownContextWindow(modelId: string): number | null {
  const normalized = modelId.trim().toLowerCase();
  if (normalized.length === 0) {
    return null;
  }

  for (const [knownModelId, windowSize] of Object.entries(MODEL_CONTEXT_WINDOWS)) {
    if (normalized === knownModelId || normalized.startsWith(`${knownModelId}-`)) {
      return windowSize;
    }
  }

  return null;
}

export interface CompactConfig {
  triggerThresholdPercent: number;
  preserveRecentRounds: number;
  maxConsecutiveFailures: number;
  contextBudget: number;
  summaryMaxTokens: number;
  auxiliaryModel?: string;
}

export interface CompactConfigOverrides {
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
    triggerThresholdPercent: overrides.triggerThresholdPercent ?? 0.85,
    preserveRecentRounds: overrides.preserveRecentRounds ?? 3,
    maxConsecutiveFailures: overrides.maxConsecutiveFailures ?? 3,
    contextBudget: overrides.contextBudget ?? resolvedBudget,
    summaryMaxTokens: overrides.summaryMaxTokens ?? 1_500,
    auxiliaryModel: args.modelConfig.auxiliaryModel.trim() || undefined,
  };
}
