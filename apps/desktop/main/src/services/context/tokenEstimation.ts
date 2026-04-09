/**
 * Token Estimation — CJK-Aware Token 估算
 *
 * Shared estimator keeps INV-3 aligned across context assembly, cost tracking,
 * and prompt budgeting instead of letting local formulas drift.
 * 容量警戒：≤87% normal, >87%~≤95% warning, >95% critical
 */

import { createHash } from "crypto";
import { estimateTokens as estimateSharedTokens } from "@shared/tokenBudget";

export function estimateTokens(text: string): number {
  return estimateSharedTokens(text);
}

export type CapacityStatus = "normal" | "warning" | "critical";

export interface CapacityResult {
  status: CapacityStatus;
  ratio: number;
}

export function checkCapacityThreshold(
  used: number,
  max: number,
): CapacityResult {
  if (max <= 0) return { status: "critical", ratio: Infinity };

  const ratio = used / max;
  if (ratio > 0.95) return { status: "critical", ratio };
  if (ratio > 0.87) return { status: "warning", ratio };
  return { status: "normal", ratio };
}

// ── Context Layer Assembly ──────────────────────────────────────

export interface ContextLayer {
  name: string;
  content: string;
  tokenCount: number;
  enabled: boolean;
  truncated?: boolean;
  truncatedTokenCount?: number;
}

type LayerInput = string | { content: string; tokenCount: number };

interface AssembleInput {
  rules: LayerInput;
  immediate: LayerInput;
}

interface AssembleConfig {
  maxTokens?: number;
}

function resolveLayer(
  name: string,
  input: LayerInput,
  enabled: boolean,
): ContextLayer {
  if (typeof input === "string") {
    return {
      name,
      content: input,
      tokenCount: estimateTokens(input),
      enabled,
    };
  }
  return {
    name,
    content: input.content,
    tokenCount: input.tokenCount,
    enabled,
  };
}

interface AssembleResult {
  layers: ContextLayer[];
  totalTokens: number;
  stablePrefixHash: string;
  stablePrefixUnchanged: boolean;
  rules: ContextLayer;
  immediate: ContextLayer & { truncated: boolean; truncatedTokenCount?: number };
  settings: ContextLayer;
  retrieved: ContextLayer;

  // Array-like iteration
  filter: (fn: (l: ContextLayer) => boolean) => ContextLayer[];
  reduce: <T>(fn: (acc: T, l: ContextLayer) => T, init: T) => T;
  find: (fn: (l: ContextLayer) => boolean) => ContextLayer | undefined;
  [Symbol.iterator]: () => Iterator<ContextLayer>;
}

export function assembleContextLayers(
  input: AssembleInput,
  config?: AssembleConfig,
): AssembleResult {
  const maxTokens = config?.maxTokens ?? 128_000;

  const rules = resolveLayer("rules", input.rules, true);
  const immediate = resolveLayer("immediate", input.immediate, true);
  const settings: ContextLayer = { name: "settings", content: "", tokenCount: 0, enabled: false };
  const retrieved: ContextLayer = { name: "retrieved", content: "", tokenCount: 0, enabled: false };

  // Check capacity: if rules + immediate > 95%, truncate immediate
  let totalTokens = rules.tokenCount + immediate.tokenCount;
  let truncated = false;
  let truncatedTokenCount: number | undefined;

  if (totalTokens > maxTokens * 0.95) {
    const allowedImmediate = Math.floor(maxTokens * 0.95) - rules.tokenCount;
    truncatedTokenCount = Math.max(0, allowedImmediate);
    truncated = true;
    totalTokens = rules.tokenCount + truncatedTokenCount;
  }

  const immediateFinal = {
    ...immediate,
    truncated,
    truncatedTokenCount: truncated ? truncatedTokenCount : undefined,
  };

  const allLayers = [rules, immediateFinal, settings, retrieved];
  const prefixHash = createHash("sha256").update(rules.content).digest("hex");

  const result: AssembleResult = {
    layers: allLayers,
    totalTokens,
    stablePrefixHash: prefixHash,
    stablePrefixUnchanged: true,
    rules,
    immediate: immediateFinal,
    settings,
    retrieved,
    filter: (fn) => allLayers.filter(fn),
    reduce: <T>(fn: (acc: T, l: ContextLayer) => T, init: T) => allLayers.reduce(fn, init),
    find: (fn) => allLayers.find(fn),
    [Symbol.iterator]: () => allLayers[Symbol.iterator](),
  };

  return result;
}
