import { createHash } from "node:crypto";
import type { MatchResult, MatchableEntity } from "../kg/entityMatcher";
import type { KnowledgeGraphService } from "../kg/kgService";
import type { MemoryService } from "../memory/memoryService";
import type { EpisodicMemoryService } from "../memory/episodicMemoryService";
import type { SimpleMemoryService } from "../memory/simpleMemoryService";
import type { SessionMemoryService } from "../memory/sessionMemory";
import type { ProjectStyleConfig } from "../project/projectManager";
import type { CharacterListService } from "../skills/characterListService";
import { createRulesFetcher } from "./fetchers/rulesFetcher";
import { createMemoryInjectionFetcher } from "./fetchers/memoryInjectionFetcher";
import { createSessionMemoryFetcher } from "./fetchers/sessionMemoryFetcher";
import { createProjectStyleFetcher } from "./fetchers/projectStyleFetcher";
import { createCharacterContextFetcher } from "./fetchers/characterContextFetcher";
import type { SynopsisStore } from "./synopsisStore";
import type { Logger } from "../../logging/logger";
import { DegradationCounter } from "../shared/degradationCounter";
import {
  estimateTokens as estimateTokenCount,
  trimUtf8ToTokenBudget as trimTextToTokenBudget,
} from "@shared/tokenBudget";
import { createCompressionEngine } from "./compressionEngine";
import type {
  ContextAssembleRequest,
  ContextBudgetLayerConfig,
  ContextBudgetProfile,
  ContextBudgetUpdateResult,
  ContextCompressedHistoryDetail,
  ContextConstraintTrimLog,
  ContextLayerAssemblyService,
  ContextLayerChunk,
  ContextLayerDetail,
  ContextLayerFetcher,
  ContextLayerFetcherMap,
  ContextLayerId,
  ContextLayerSummary,
  ContextRuleConstraint,
} from "./types";

export type {
  ContextAssembleRequest,
  ContextAssembleResult,
  ContextBudgetLayerConfig,
  ContextBudgetProfile,
  ContextBudgetUpdateErrorCode,
  ContextBudgetUpdateRequest,
  ContextBudgetUpdateResult,
  ContextConstraintSource,
  ContextConstraintTrimLog,
  ContextInspectRequest,
  ContextInspectResult,
  ContextLayerAssemblyService,
  ContextLayerChunk,
  ContextLayerDetail,
  ContextLayerFetcher,
  ContextLayerFetcherMap,
  ContextLayerFetchResult,
  ContextLayerId,
  ContextLayerSummary,
  ContextRuleConstraint,
} from "./types";

type ProjectStyleResult<T> =
  | { success: true; data?: T }
  | { success: false; error: { code: string; message: string } };

export type ContextLayerAssemblyDeps = {
  onConstraintTrim?: (log: ContextConstraintTrimLog) => void;
  kgService?: Pick<KnowledgeGraphService, "entityList">;
  memoryService?: Pick<MemoryService, "previewInjection">;
  simpleMemoryService?: Pick<SimpleMemoryService, "inject">;
  /** L1 session-aware memory (INV-4). Optional — degrades gracefully when absent. */
  sessionMemoryService?: Pick<SessionMemoryService, "injectForContext">;
  /** Active session ID for L1 memory lookup. Must be wired alongside sessionMemoryService. */
  activeSessionId?: string;
  projectService?: {
    getStyleConfig: (projectId: string) => Promise<ProjectStyleResult<ProjectStyleConfig>>;
  };
  characterListService?: Pick<CharacterListService, "injectCharactersIntoContext">;
  synopsisStore?: Pick<SynopsisStore, "listRecentByProject">;
  episodicMemoryService?: Pick<EpisodicMemoryService, "listSemanticMemory">;
  matchEntities?: (text: string, entities: MatchableEntity[]) => MatchResult[];
  logger?: Pick<Logger, "info" | "error"> & {
    warn?: (event: string, data?: Record<string, unknown>) => void;
  };
  degradationCounter?: DegradationCounter;
  degradationEscalationThreshold?: number;
};

const LAYER_ORDER: ContextLayerId[] = [
  "rules",
  "settings",
  "retrieved",
  "immediate",
];

const TRUNCATION_ORDER: Array<Exclude<ContextLayerId, "rules">> = [
  "retrieved",
  "settings",
  "immediate",
];

const LAYER_DEGRADED_WARNING: Record<ContextLayerId, string> = {
  rules: "KG_UNAVAILABLE",
  settings: "SETTINGS_UNAVAILABLE",
  retrieved: "RAG_UNAVAILABLE",
  immediate: "IMMEDIATE_UNAVAILABLE",
};
const RETRIEVED_CHUNK_LIMIT_WARNING = "CONTEXT_RETRIEVED_CHUNK_LIMIT";

export const CONTEXT_SLO_THRESHOLDS_MS = {
  assemble: { p95: 250, p99: 500 },
  inspect: { p95: 180, p99: 350 },
  budgetCalculation: { p95: 80, p99: 150 },
} as const;

export const CONTEXT_CAPACITY_LIMITS = {
  maxInputTokens: 64000,
  maxRetrievedChunks: 200,
  maxConcurrentByDocument: 4,
} as const;

const DEFAULT_TOTAL_BUDGET_TOKENS = 6000;
const DEFAULT_TOKENIZER_ID = "cn-byte-estimator";
const DEFAULT_TOKENIZER_VERSION = "1.0.0";
const DEFAULT_HISTORY_COMPACTION_KEEP_RECENT_ROUNDS = 3;
const PUBLIC_CONTEXT_PROMPT_LAYERS = [
  "rules",
  "compressedHistory",
  "immediate",
] as const;
const NON_DETERMINISTIC_PREFIX_FIELDS = new Set([
  "timestamp",
  "requestId",
  "nonce",
]);
const RULES_CONSTRAINT_HEADER = "[创作约束 - 不可违反]";

type InternalContextLayerDetail = ContextLayerDetail & {
  constraintItems?: ContextRuleConstraint[];
  rulesBaseContent?: string;
};
type ConversationSurfaceMessage =
  NonNullable<ContextAssembleRequest["conversationMessages"]>[number];

export type ContextAssemblyErrorCode = "CONTEXT_SCOPE_VIOLATION";

export class ContextAssemblyError extends Error {
  readonly code: ContextAssemblyErrorCode;

  constructor(code: ContextAssemblyErrorCode, message: string) {
    super(message);
    this.name = "ContextAssemblyError";
    this.code = code;
  }
}

export function isContextAssemblyError(
  error: unknown,
): error is ContextAssemblyError {
  return error instanceof ContextAssemblyError;
}

/**
 * Why: source and warning lists must stay deterministic and free of empty noise
 * for stable contract assertions.
 */
function uniqueNonEmpty(values: readonly string[]): string[] {
  const deduped = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      deduped.add(trimmed);
    }
  }
  return [...deduped];
}

/**
 * Why: CE5 requires blocking cross-project layer injection before prompt
 * assembly to keep context scope boundaries explicit and auditable.
 */
function assertLayerChunkScope(args: {
  projectId: string;
  chunks: readonly ContextLayerChunk[];
}): void {
  for (const chunk of args.chunks) {
    if (!chunk.projectId || chunk.projectId.trim().length === 0) {
      continue;
    }
    if (chunk.projectId === args.projectId) {
      continue;
    }
    throw new ContextAssemblyError(
      "CONTEXT_SCOPE_VIOLATION",
      `Layer chunk scope mismatch: expected ${args.projectId}, got ${chunk.projectId}`,
    );
  }
}

/**
 * Why: layer chunks from heterogeneous sources need one stable merge strategy so
 * inspect and assemble views remain aligned.
 */
function mergeLayerContent(chunks: readonly ContextLayerChunk[]): string {
  return chunks
    .map((chunk) => chunk.content)
    .filter((content) => content.trim().length > 0)
    .join("\n\n");
}

/**
 * Why: constraints sorting must remain deterministic across rule injection.
 */
function parseConstraintUpdatedAt(updatedAt: string): number {
  const ms = Date.parse(updatedAt);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Why: CE4 requires `user > kg`, then `updatedAt desc`, then `id asc`.
 */
function compareConstraintsForRules(
  left: ContextRuleConstraint,
  right: ContextRuleConstraint,
): number {
  const leftSourceRank = left.source === "user" ? 0 : 1;
  const rightSourceRank = right.source === "user" ? 0 : 1;
  if (leftSourceRank !== rightSourceRank) {
    return leftSourceRank - rightSourceRank;
  }

  const leftUpdatedAt = parseConstraintUpdatedAt(left.updatedAt);
  const rightUpdatedAt = parseConstraintUpdatedAt(right.updatedAt);
  if (leftUpdatedAt !== rightUpdatedAt) {
    return rightUpdatedAt - leftUpdatedAt;
  }

  return left.id.localeCompare(right.id);
}

/**
 * Why: CE4 requires a fixed, human-auditable rules injection format.
 */
function renderRulesConstraintBlock(
  constraints: readonly ContextRuleConstraint[],
): string {
  if (constraints.length === 0) {
    return "";
  }

  const lines = constraints.map(
    (constraint, index) =>
      `${(index + 1).toString()}. ${constraint.text}  # source=${constraint.source}, priority=${constraint.priority.toString()}`,
  );

  return `${RULES_CONSTRAINT_HEADER}\n${lines.join("\n")}`;
}

/**
 * Why: keep rule text and constraints block composition deterministic.
 */
function composeRulesContent(args: {
  baseContent: string;
  constraints: readonly ContextRuleConstraint[];
}): string {
  const parts = [
    args.baseContent.trim(),
    renderRulesConstraintBlock(args.constraints),
  ].filter((part) => part.length > 0);

  return parts.join("\n\n");
}

/**
 * Why: constraints payload can come from mixed fetchers and must be sanitized
 * before sorting/trimming.
 */
function normalizeRulesConstraints(
  constraints: readonly ContextRuleConstraint[],
): ContextRuleConstraint[] {
  return constraints
    .map((constraint) => ({
      ...constraint,
      id: constraint.id.trim(),
      text: constraint.text.trim(),
      updatedAt: constraint.updatedAt.trim(),
    }))
    .filter(
      (constraint) =>
        constraint.id.length > 0 &&
        constraint.text.length > 0 &&
        (constraint.source === "user" || constraint.source === "kg") &&
        Number.isFinite(constraint.priority),
    )
    .sort(compareConstraintsForRules);
}

/**
 * Why: CE4 trimming requires deterministic candidate selection.
 */
function pickConstraintToTrim(
  constraints: readonly ContextRuleConstraint[],
): ContextRuleConstraint | null {
  const kgCandidates = constraints
    .filter((constraint) => constraint.source === "kg")
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      const leftUpdatedAt = parseConstraintUpdatedAt(left.updatedAt);
      const rightUpdatedAt = parseConstraintUpdatedAt(right.updatedAt);
      if (leftUpdatedAt !== rightUpdatedAt) {
        return leftUpdatedAt - rightUpdatedAt;
      }

      return left.id.localeCompare(right.id);
    });
  if (kgCandidates.length > 0) {
    return kgCandidates[0];
  }

  const degradableUserCandidates = constraints
    .filter(
      (constraint) => constraint.source === "user" && constraint.degradable,
    )
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      const leftUpdatedAt = parseConstraintUpdatedAt(left.updatedAt);
      const rightUpdatedAt = parseConstraintUpdatedAt(right.updatedAt);
      if (leftUpdatedAt !== rightUpdatedAt) {
        return leftUpdatedAt - rightUpdatedAt;
      }

      return left.id.localeCompare(right.id);
    });
  if (degradableUserCandidates.length > 0) {
    return degradableUserCandidates[0];
  }

  return null;
}

/**
 * Why: CE4 requires trimming logs with `constraintId/reason/tokenFreed`.
 */
function trimRulesConstraintsToBudget(args: {
  baseContent: string;
  constraints: readonly ContextRuleConstraint[];
  maxTokens: number;
}): {
  content: string;
  tokenCount: number;
  constraints: ContextRuleConstraint[];
  trimmedLogs: ContextConstraintTrimLog[];
} {
  let kept = normalizeRulesConstraints(args.constraints);
  const trimmedLogs: ContextConstraintTrimLog[] = [];
  let content = composeRulesContent({
    baseContent: args.baseContent,
    constraints: kept,
  });
  let tokenCount = estimateTokenCount(content);

  while (tokenCount > args.maxTokens) {
    const selected = pickConstraintToTrim(kept);
    if (!selected) {
      break;
    }

    const before = tokenCount;
    kept = kept.filter((constraint) => constraint.id !== selected.id);
    content = composeRulesContent({
      baseContent: args.baseContent,
      constraints: kept,
    });
    tokenCount = estimateTokenCount(content);

    const tokenFreed = Math.max(0, before - tokenCount);
    trimmedLogs.push({
      constraintId: selected.id,
      reason: selected.source === "kg" ? "KG_LOW_PRIORITY" : "USER_DEGRADABLE",
      tokenFreed,
    });
  }

  return {
    content,
    tokenCount,
    constraints: kept,
    trimmedLogs,
  };
}

/**
 * Why: JSON-ish rules/settings payloads can include non-deterministic fields
 * and unordered keys that must not pollute stable prefix hashing.
 */
function canonicalizeStablePrefixValue(
  value: unknown,
  parentKey?: string,
): unknown {
  if (Array.isArray(value)) {
    const normalizedItems = value.map((item) =>
      canonicalizeStablePrefixValue(item, parentKey),
    );

    if (parentKey !== "constraints") {
      return normalizedItems;
    }

    return [...normalizedItems].sort((left, right) => {
      const leftRecord =
        typeof left === "object" && left !== null
          ? (left as Record<string, unknown>)
          : {};
      const rightRecord =
        typeof right === "object" && right !== null
          ? (right as Record<string, unknown>)
          : {};

      const leftPriority = Number(
        leftRecord.priority ?? Number.NEGATIVE_INFINITY,
      );
      const rightPriority = Number(
        rightRecord.priority ?? Number.NEGATIVE_INFINITY,
      );
      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }

      const leftId = String(leftRecord.id ?? "");
      const rightId = String(rightRecord.id ?? "");
      if (leftId !== rightId) {
        return leftId.localeCompare(rightId);
      }

      return JSON.stringify(leftRecord).localeCompare(
        JSON.stringify(rightRecord),
      );
    });
  }

  if (typeof value === "object" && value !== null) {
    const normalized: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !NON_DETERMINISTIC_PREFIX_FIELDS.has(key))
      .sort(([left], [right]) => left.localeCompare(right));

    for (const [key, child] of entries) {
      normalized[key] = canonicalizeStablePrefixValue(child, key);
    }
    return normalized;
  }

  return value;
}

/**
 * Why: rules/settings can be plain text or JSON; canonicalization should apply
 * only when JSON parsing is reliable.
 */
function canonicalizeLayerForStablePrefix(content: string): unknown {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return "";
  }

  const looksLikeJson =
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"));
  if (!looksLikeJson) {
    return trimmed;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return canonicalizeStablePrefixValue(parsed);
  } catch {
    return trimmed;
  }
}

/**
 * Why: stable prefix state must be content-addressed and deterministic across
 * process restarts.
 */
function hashStablePrefix(
  rulesContent: string,
): string {
  const canonicalizedPayload = canonicalizeStablePrefixValue({
    rules: canonicalizeLayerForStablePrefix(rulesContent),
  });

  return createHash("sha256")
    .update(JSON.stringify(canonicalizedPayload), "utf8")
    .digest("hex");
}

/**
 * Why: CE3 unchanged semantics are scoped by project/skill/provider/model/
 * tokenizerVersion so cache hit state follows prompt-caching boundaries.
 */
function keyForStablePrefix(args: {
  request: ContextAssembleRequest;
  tokenizerVersion: string;
}): string {
  const provider =
    args.request.provider?.trim().length && args.request.provider
      ? args.request.provider
      : "default-provider";
  const model =
    args.request.model?.trim().length && args.request.model
      ? args.request.model
      : "default-model";
  const tokenizerVersion =
    args.request.tokenizerVersion?.trim().length &&
    args.request.tokenizerVersion
      ? args.request.tokenizerVersion
      : args.tokenizerVersion;

  return `${args.request.projectId}:${args.request.skillId}:${provider}:${model}:${tokenizerVersion}`;
}

/**
 * Why: prompt rendering must preserve fixed layer order for deterministic debug
 * inspection and downstream assertions.
 */
function toLayerPrompt(args: {
  layer: ContextLayerId | "compressedHistory";
  content: string;
}): string {
  const title =
    args.layer === "compressedHistory"
      ? "Compressed History"
      : args.layer[0].toUpperCase() + args.layer.slice(1);
  return `## ${title}\n${args.content.length > 0 ? args.content : "(none)"}`;
}

/**
 * Why: deterministic fallback keeps `context:prompt:assemble` available even
 * when one layer source is temporarily unavailable.
 */
async function fetchLayerWithDegrade(args: {
  layer: ContextLayerId;
  request: ContextAssembleRequest;
  fetcher: ContextLayerFetcher;
}): Promise<InternalContextLayerDetail> {
  try {
    const fetched = await args.fetcher(args.request);
    const retrievedChunksCapped =
      args.layer === "retrieved" &&
      fetched.chunks.length > CONTEXT_CAPACITY_LIMITS.maxRetrievedChunks;
    const boundedChunks = retrievedChunksCapped
      ? fetched.chunks.slice(0, CONTEXT_CAPACITY_LIMITS.maxRetrievedChunks)
      : fetched.chunks;

    assertLayerChunkScope({
      projectId: args.request.projectId,
      chunks: boundedChunks,
    });

    const source = uniqueNonEmpty(boundedChunks.map((chunk) => chunk.source));
    const baseContent = mergeLayerContent(boundedChunks);
    const constraints =
      args.layer === "rules"
        ? normalizeRulesConstraints(
            boundedChunks.flatMap((chunk) => chunk.constraints ?? []),
          )
        : [];
    const content =
      args.layer === "rules"
        ? composeRulesContent({
            baseContent,
            constraints,
          })
        : baseContent;
    const warnings = uniqueNonEmpty([
      ...(fetched.warnings ?? []),
      ...(retrievedChunksCapped ? [RETRIEVED_CHUNK_LIMIT_WARNING] : []),
    ]);

    return {
      content,
      source,
      tokenCount: estimateTokenCount(content),
      truncated: fetched.truncated === true || retrievedChunksCapped,
      ...(warnings.length > 0 ? { warnings } : {}),
      ...(args.layer === "rules"
        ? {
            constraintItems: constraints,
            rulesBaseContent: baseContent,
          }
        : {}),
    };
  } catch (error) {
    if (isContextAssemblyError(error)) {
      throw error;
    }
    const warning = LAYER_DEGRADED_WARNING[args.layer];
    return {
      content: "",
      source: [],
      tokenCount: 0,
      truncated: false,
      warnings: [warning],
      ...(args.layer === "rules"
        ? {
            constraintItems: [],
            rulesBaseContent: "",
          }
        : {}),
    };
  }
}

/**
 * Why: mutable layer transforms must not mutate upstream fetch outputs.
 */
function cloneLayerDetail(
  layer: InternalContextLayerDetail,
): InternalContextLayerDetail {
  return {
    content: layer.content,
    source: [...layer.source],
    tokenCount: layer.tokenCount,
    truncated: layer.truncated,
    ...(layer.warnings ? { warnings: [...layer.warnings] } : {}),
    ...(layer.constraintItems
      ? { constraintItems: layer.constraintItems.map((item) => ({ ...item })) }
      : {}),
    ...(layer.rulesBaseContent !== undefined
      ? { rulesBaseContent: layer.rulesBaseContent }
      : {}),
  };
}

/**
 * Why: fixed CE2 defaults must be centralized for deterministic get/update
 * behavior and test assertions.
 */
function defaultBudgetLayers(): Record<
  ContextLayerId,
  ContextBudgetLayerConfig
> {
  return {
    rules: { ratio: 0.15, minimumTokens: 500 },
    settings: { ratio: 0.1, minimumTokens: 200 },
    retrieved: { ratio: 0.25, minimumTokens: 0 },
    immediate: { ratio: 0.5, minimumTokens: 2000 },
  };
}

/**
 * Why: service state must always start from a valid CE2 profile.
 */
function buildDefaultBudgetProfile(): ContextBudgetProfile {
  return {
    version: 1,
    tokenizerId: DEFAULT_TOKENIZER_ID,
    tokenizerVersion: DEFAULT_TOKENIZER_VERSION,
    totalBudgetTokens: DEFAULT_TOTAL_BUDGET_TOKENS,
    layers: defaultBudgetLayers(),
  };
}

/**
 * Why: callers must never obtain mutable references to internal budget state.
 */
function cloneBudgetProfile(
  profile: ContextBudgetProfile,
): ContextBudgetProfile {
  return {
    version: profile.version,
    tokenizerId: profile.tokenizerId,
    tokenizerVersion: profile.tokenizerVersion,
    totalBudgetTokens: profile.totalBudgetTokens,
    layers: {
      rules: { ...profile.layers.rules },
      settings: { ...profile.layers.settings },
      retrieved: { ...profile.layers.retrieved },
      immediate: { ...profile.layers.immediate },
    },
  };
}

/**
 * Why: CE2 budgets are ratio-derived with per-layer minimum guarantees.
 */
function deriveLayerBudgetCaps(
  profile: ContextBudgetProfile,
): Record<ContextLayerId, number> {
  const total = profile.totalBudgetTokens;
  return {
    rules: Math.max(
      profile.layers.rules.minimumTokens,
      Math.floor(total * profile.layers.rules.ratio),
    ),
    settings: Math.max(
      profile.layers.settings.minimumTokens,
      Math.floor(total * profile.layers.settings.ratio),
    ),
    retrieved: Math.max(
      profile.layers.retrieved.minimumTokens,
      Math.floor(total * profile.layers.retrieved.ratio),
    ),
    immediate: Math.max(
      profile.layers.immediate.minimumTokens,
      Math.floor(total * profile.layers.immediate.ratio),
    ),
  };
}

/**
 * Why: update path must return explicit CE2 errors instead of accepting drifted
 * or malformed profile inputs.
 */
function validateBudgetUpdateInput(
  layers: Record<ContextLayerId, ContextBudgetLayerConfig>,
): ContextBudgetUpdateResult | null {
  const ratioValues = LAYER_ORDER.map((layer) => layers[layer].ratio);
  const ratioSum = ratioValues.reduce((acc, value) => acc + value, 0);

  const invalidRatio = ratioValues.some(
    (ratio) => !Number.isFinite(ratio) || ratio < 0,
  );
  if (invalidRatio || Math.abs(ratioSum - 1) > 1e-9) {
    return {
      ok: false,
      error: {
        code: "CONTEXT_BUDGET_INVALID_RATIO",
        message: "Budget ratios must be finite, non-negative and sum to 1",
      },
    };
  }

  const invalidMinimum = LAYER_ORDER.some((layer) => {
    const minimum = layers[layer].minimumTokens;
    return (
      !Number.isFinite(minimum) || !Number.isInteger(minimum) || minimum < 0
    );
  });
  if (invalidMinimum) {
    return {
      ok: false,
      error: {
        code: "CONTEXT_BUDGET_INVALID_MINIMUM",
        message: "minimumTokens must be a non-negative integer",
      },
    };
  }

  return null;
}

/**
 * Why: warnings and prompt layers must reflect post-budget state.
 */
function totalLayerTokens(
  layers: Record<ContextLayerId, InternalContextLayerDetail>,
): number {
  return (
    layers.rules.tokenCount +
    layers.settings.tokenCount +
    layers.retrieved.tokenCount +
    layers.immediate.tokenCount
  );
}

function totalPublicLayerTokens(layers: {
  rules: ContextLayerDetail;
  compressedHistory: ContextCompressedHistoryDetail;
  immediate: ContextLayerDetail;
}): number {
  return (
    layers.rules.tokenCount +
    layers.compressedHistory.tokenCount +
    layers.immediate.tokenCount
  );
}

function calculateCapacityPercent(totalTokens: number, maxBudget: number): number {
  if (!Number.isFinite(maxBudget) || maxBudget <= 0) {
    return 100;
  }

  return Math.max(0, Math.min(100, (totalTokens / maxBudget) * 100));
}

/**
 * Why: CE2 requires fixed truncation order and a non-trimmable Rules layer.
 */
function applyBudgetToLayers(args: {
  layers: Record<ContextLayerId, InternalContextLayerDetail>;
  budgetProfile: ContextBudgetProfile;
  onConstraintTrim?: (log: ContextConstraintTrimLog) => void;
}): {
  layers: Record<ContextLayerId, InternalContextLayerDetail>;
  warnings: string[];
} {
  const layers: Record<ContextLayerId, InternalContextLayerDetail> = {
    rules: cloneLayerDetail(args.layers.rules),
    settings: cloneLayerDetail(args.layers.settings),
    retrieved: cloneLayerDetail(args.layers.retrieved),
    immediate: cloneLayerDetail(args.layers.immediate),
  };
  const warnings: string[] = [];
  const layerCaps = deriveLayerBudgetCaps(args.budgetProfile);

  if (layers.rules.tokenCount > layerCaps.rules) {
    warnings.push("CONTEXT_RULES_OVERBUDGET");

    if (
      layers.rules.constraintItems &&
      layers.rules.constraintItems.length > 0
    ) {
      const trimmed = trimRulesConstraintsToBudget({
        baseContent: layers.rules.rulesBaseContent ?? "",
        constraints: layers.rules.constraintItems,
        maxTokens: layerCaps.rules,
      });

      if (trimmed.trimmedLogs.length > 0) {
        layers.rules = {
          ...layers.rules,
          content: trimmed.content,
          tokenCount: trimmed.tokenCount,
          truncated: true,
          constraintItems: trimmed.constraints,
        };

        for (const trimLog of trimmed.trimmedLogs) {
          args.onConstraintTrim?.(trimLog);
        }
      }
    }
  }

  let overflow =
    totalLayerTokens(layers) - args.budgetProfile.totalBudgetTokens;

  for (const layerId of TRUNCATION_ORDER) {
    if (overflow <= 0) {
      break;
    }

    const current = layers[layerId];
    const minimumTokens = args.budgetProfile.layers[layerId].minimumTokens;
    const removableTokens = Math.max(0, current.tokenCount - minimumTokens);
    if (removableTokens <= 0) {
      continue;
    }

    const targetTokens =
      current.tokenCount - Math.min(removableTokens, overflow);
    const trimmedContent = trimTextToTokenBudget(current.content, targetTokens);
    const trimmedTokens = estimateTokenCount(trimmedContent);
    const reducedTokens = Math.max(0, current.tokenCount - trimmedTokens);

    if (reducedTokens > 0) {
      layers[layerId] = {
        ...current,
        content: trimmedContent,
        tokenCount: trimmedTokens,
        truncated: true,
      };
      overflow -= reducedTokens;
    }
  }

  return { layers, warnings };
}

/**
 * Why: assemble contract exposes summaries while inspect exposes details; one
 * adapter keeps the two representations consistent.
 */
function layerSummary(detail: ContextLayerDetail): ContextLayerSummary {
  return {
    source: detail.source,
    tokenCount: detail.tokenCount,
    truncated: detail.truncated,
    ...(detail.warnings && detail.warnings.length > 0
      ? { warnings: detail.warnings }
      : {}),
  };
}

/**
 * Why: internal metadata must never leak across assemble/inspect IPC contracts.
 */
function toPublicLayerDetail(
  detail: InternalContextLayerDetail,
): ContextLayerDetail {
  return {
    content: detail.content,
    source: detail.source,
    tokenCount: detail.tokenCount,
    truncated: detail.truncated,
    ...(detail.warnings && detail.warnings.length > 0
      ? { warnings: detail.warnings }
      : {}),
  };
}

function buildPublicAssembleLayers(layers: {
  rules: ContextLayerDetail;
  compressedHistory: ContextCompressedHistoryDetail;
  immediate: ContextLayerDetail;
}) {
  return {
    rules: layerSummary(layers.rules),
    compressedHistory: {
      ...layerSummary(layers.compressedHistory),
      compressed: layers.compressedHistory.compressed,
      ...(layers.compressedHistory.compressionRatio !== undefined
        ? { compressionRatio: layers.compressedHistory.compressionRatio }
        : {}),
    },
    immediate: layerSummary(layers.immediate),
  };
}

function buildPublicInspectLayers(layers: {
  rules: ContextLayerDetail;
  compressedHistory: ContextCompressedHistoryDetail;
  immediate: ContextLayerDetail;
}) {
  return {
    rules: layers.rules,
    compressedHistory: layers.compressedHistory,
    immediate: layers.immediate,
  };
}

function splitHistorySegments(text: string): string[] {
  return text
    .split(/\n+/u)
    .flatMap((block) =>
      block
        .split(/(?<=[。！？!?])/u)
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0),
    )
    .filter((segment) => segment.length > 0);
}

function formatConversationHistoryContent(
  messages: ReadonlyArray<Pick<ConversationSurfaceMessage, "content">>,
): string {
  return messages
    .map((message) => message.content)
    .filter((content) => content.trim().length > 0)
    .join("\n");
}

function splitConversationByRecentRounds(
  messages: ReadonlyArray<ConversationSurfaceMessage>,
  keepRecentRounds: number,
): {
  historyMessages: ConversationSurfaceMessage[];
  recentMessages: ConversationSurfaceMessage[];
  recentRoundsKept: number;
} {
  if (messages.length === 0) {
    return { historyMessages: [], recentMessages: [], recentRoundsKept: 0 };
  }

  if (keepRecentRounds <= 0) {
    return {
      historyMessages: [...messages],
      recentMessages: [],
      recentRoundsKept: 0,
    };
  }

  const rounds: ConversationSurfaceMessage[][] = [];

  for (const message of messages) {
    const lastRound = rounds.at(-1);
    if (message.role === "user" || lastRound === undefined) {
      rounds.push([message]);
      continue;
    }

    lastRound.push(message);
  }

  const recentRounds = rounds.slice(-keepRecentRounds);
  const historyRounds = rounds.slice(0, Math.max(0, rounds.length - keepRecentRounds));

  return {
    historyMessages: historyRounds.flat(),
    recentMessages: recentRounds.flat(),
    recentRoundsKept: recentRounds.length,
  };
}

function formatCompressedHistorySurface(args: {
  compressedContent: string;
  recentMessages: ReadonlyArray<ConversationSurfaceMessage>;
  recentRoundsKept: number;
}): string {
  const sections: string[] = [];
  const compressedContent = args.compressedContent.trim();
  if (compressedContent.length > 0) {
    sections.push(compressedContent);
  }

  const recentContent = formatConversationHistoryContent(args.recentMessages);
  if (recentContent.length > 0) {
    sections.push(
      `[最近保留的 ${args.recentRoundsKept} 轮完整对话]\n${recentContent}`,
    );
  }

  return sections.join("\n\n");
}

function createDeterministicCompressionEngine() {
  return createCompressionEngine(
    {
      complete: async (params) => {
        const body = params.messages
          .map((message) => String(message.content ?? ""))
          .join("\n")
          .replace(/\s+/gu, " ")
          .trim();
        const summary =
          body.length <= 240
            ? body
            : `${body.slice(0, 120)} … ${body.slice(-100)}`;
        return { content: summary };
      },
    },
    {
      circuitBreaker: {
        failureThreshold: 3,
        cooldownMs: 1_000,
      },
      timeoutMs: 1_000,
      minTokenThreshold: 500,
    },
  );
}

async function buildCompressedHistoryDetail(args: {
  request: ContextAssembleRequest;
  rules: ContextLayerDetail;
  immediate: ContextLayerDetail;
  maxBudget: number;
  compressionEngine: ReturnType<typeof createDeterministicCompressionEngine>;
}): Promise<{
  compressedHistory: ContextCompressedHistoryDetail;
  immediate: ContextLayerDetail;
  compressionApplied: boolean;
}> {
  const emptyCompressedHistory: ContextCompressedHistoryDetail = {
    content: "",
    source: ["compressed-history"],
    tokenCount: 0,
    truncated: false,
    compressed: false,
  };

  const conversationMessages =
    args.request.conversationMessages?.filter(
      (message) => message.content.trim().length > 0,
    ) ?? [];

  const fallbackSegments = splitHistorySegments(args.immediate.content);
  const sourceMessages =
    conversationMessages.length > 0
      ? conversationMessages
      : fallbackSegments.map((content, index) => ({
          role: (index % 2 === 0 ? "user" : "assistant") as
            | "user"
            | "assistant",
          content,
        }));
  const currentTotal =
    args.rules.tokenCount +
    Math.max(
      args.immediate.tokenCount,
      estimateTokenCount(sourceMessages.map((message) => message.content).join("\n")),
    );
  const shouldCompress = args.compressionEngine.shouldCompress(
    currentTotal,
    args.maxBudget,
  );

  if (conversationMessages.length === 0 && !shouldCompress) {
    return {
      compressedHistory: emptyCompressedHistory,
      immediate: args.immediate,
      compressionApplied: false,
    };
  }

  if (sourceMessages.length === 0) {
    return {
      compressedHistory: emptyCompressedHistory,
      immediate: args.immediate,
      compressionApplied: false,
    };
  }

  const { historyMessages, recentMessages, recentRoundsKept } =
    splitConversationByRecentRounds(
      sourceMessages,
      DEFAULT_HISTORY_COMPACTION_KEEP_RECENT_ROUNDS,
    );

  if (
    historyMessages.length === 0 ||
    !shouldCompress
  ) {
    const rawHistoryContent = formatConversationHistoryContent(sourceMessages);
    return {
      compressedHistory: {
        ...emptyCompressedHistory,
        content: rawHistoryContent,
        tokenCount: estimateTokenCount(rawHistoryContent),
      },
      immediate: args.immediate,
      compressionApplied: false,
    };
  }

  const compressionResult = await args.compressionEngine.compress({
    messages: historyMessages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    targetTokens: Math.max(80, Math.floor(currentTotal * 0.3)),
    narrativeContext: {
      characterNames: [],
      plotPoints: [],
      toneMarkers: [],
      foreshadowingClues: [],
      timelineMarkers: [],
      narrativePOV: undefined,
    },
    projectId: args.request.projectId,
    documentId: args.request.documentId,
  });

  const compressedContent = compressionResult.compressedMessages
    .map((message) => message.content.trim())
    .filter((content) => content.length > 0)
    .join("\n");

  const recentContent = formatConversationHistoryContent(recentMessages);
  const compressedHistoryContent =
    conversationMessages.length > 0
      ? formatCompressedHistorySurface({
          compressedContent,
          recentMessages,
          recentRoundsKept,
        })
      : compressedContent;

  return {
    compressedHistory: {
      content: compressedHistoryContent,
      source: ["compressed-history"],
      tokenCount: estimateTokenCount(compressedHistoryContent),
      truncated: compressionResult.compressedTokens < compressionResult.originalTokens,
      compressed: true,
      compressionRatio: compressionResult.compressionRatio,
      ...(compressionResult.warnings.length > 0
        ? { warnings: compressionResult.warnings }
        : {}),
    },
    immediate:
      conversationMessages.length > 0
        ? args.immediate
        : {
            ...args.immediate,
            content: recentContent,
            tokenCount: estimateTokenCount(recentContent),
            truncated: recentContent !== args.immediate.content || args.immediate.truncated,
          },
    compressionApplied: true,
  };
}

/**
 * Why: `source` and `tokenCount` are hard-required fields in CE contract.
 */
function validateLayerContract(layer: InternalContextLayerDetail): void {
  if (!Array.isArray(layer.source)) {
    throw new Error("CONTEXT_LAYER_CONTRACT_INVALID_SOURCE");
  }
  if (typeof layer.tokenCount !== "number" || Number.isNaN(layer.tokenCount)) {
    throw new Error("CONTEXT_LAYER_CONTRACT_INVALID_TOKEN_COUNT");
  }
}

/**
 * Why: one shared snapshot source keeps `assemble` and `inspect` contracts
 * consistent while preserving fixed layer order.
 */
async function buildContextSnapshot(args: {
  request: ContextAssembleRequest;
  fetchers: ContextLayerFetcherMap;
  budgetProfile: ContextBudgetProfile;
  onConstraintTrim?: (log: ContextConstraintTrimLog) => void;
}): Promise<{
  layersDetail: Record<ContextLayerId, ContextLayerDetail>;
  compressedHistory: ContextCompressedHistoryDetail;
  compressionApplied: boolean;
  warnings: string[];
  prompt: string;
  tokenCount: number;
  stablePrefixHash: string;
}> {
  const requestWithBudget: ContextAssembleRequest = {
    ...args.request,
    totalContextBudgetTokens:
      args.request.totalContextBudgetTokens ?? args.budgetProfile.totalBudgetTokens,
  };

  const rules = await fetchLayerWithDegrade({
    layer: "rules",
    request: requestWithBudget,
    fetcher: args.fetchers.rules,
  });
  const settings = await fetchLayerWithDegrade({
    layer: "settings",
    request: requestWithBudget,
    fetcher: args.fetchers.settings,
  });
  const retrieved = await fetchLayerWithDegrade({
    layer: "retrieved",
    request: requestWithBudget,
    fetcher: args.fetchers.retrieved,
  });
  const immediate = await fetchLayerWithDegrade({
    layer: "immediate",
    request: requestWithBudget,
    fetcher: args.fetchers.immediate,
  });

  validateLayerContract(rules);
  validateLayerContract(settings);
  validateLayerContract(retrieved);
  validateLayerContract(immediate);

  const budgetApplied = applyBudgetToLayers({
    layers: {
      rules,
      settings,
      retrieved,
      immediate,
    },
    budgetProfile: args.budgetProfile,
    onConstraintTrim: args.onConstraintTrim,
  });

  const compressionEngine = createDeterministicCompressionEngine();
  const compressed = await buildCompressedHistoryDetail({
    request: requestWithBudget,
    rules: toPublicLayerDetail(budgetApplied.layers.rules),
    immediate: toPublicLayerDetail(budgetApplied.layers.immediate),
    maxBudget: args.budgetProfile.totalBudgetTokens,
    compressionEngine,
  });
  compressionEngine.dispose();

  const warnings = uniqueNonEmpty([
    ...(budgetApplied.layers.rules.warnings ?? []),
    ...(budgetApplied.layers.settings.warnings ?? []),
    ...(budgetApplied.layers.retrieved.warnings ?? []),
    ...(budgetApplied.layers.immediate.warnings ?? []),
    ...(compressed.compressedHistory.warnings ?? []),
    ...budgetApplied.warnings,
  ]);

  const layersDetail = {
    rules: toPublicLayerDetail(budgetApplied.layers.rules),
    settings: toPublicLayerDetail(budgetApplied.layers.settings),
    retrieved: toPublicLayerDetail(budgetApplied.layers.retrieved),
    immediate: compressed.immediate,
  };
  const prompt = PUBLIC_CONTEXT_PROMPT_LAYERS
    .map((layerId) =>
      toLayerPrompt({
        layer: layerId,
        content:
          layerId === "compressedHistory"
            ? compressed.compressedHistory.content
            : (layerId === "immediate"
                ? compressed.immediate.content
                : layersDetail[layerId].content),
      }),
    )
    .join("\n\n");

  return {
    layersDetail,
    compressedHistory: compressed.compressedHistory,
    compressionApplied: compressed.compressionApplied,
    warnings,
    prompt,
    tokenCount: totalPublicLayerTokens({
      rules: layersDetail.rules,
      compressedHistory: compressed.compressedHistory,
      immediate: compressed.immediate,
    }),
    stablePrefixHash: hashStablePrefix(budgetApplied.layers.rules.content),
  };
}

/**
 * Why: deterministic defaults keep context IPC callable before RAG/KG/Memory
 * integrations are fully wired.
 */
function defaultFetchers(
  deps?: Pick<
    ContextLayerAssemblyDeps,
    | "kgService"
    | "memoryService"
    | "simpleMemoryService"
    | "sessionMemoryService"
    | "activeSessionId"
    | "projectService"
    | "characterListService"
    | "synopsisStore"
    | "episodicMemoryService"
    | "matchEntities"
    | "logger"
    | "degradationCounter"
    | "degradationEscalationThreshold"
  >,
): ContextLayerFetcherMap {
  const degradationCounter =
    deps?.degradationCounter ??
    new DegradationCounter({
      threshold: deps?.degradationEscalationThreshold,
    });

  const fallbackRulesFetcher: ContextLayerFetcher = async (request) => ({
    chunks: [
      {
        source: "kg:entities",
        content: `Skill ${request.skillId} must follow project rules.`,
      },
    ],
  });

  const settingsSubFetchers: ContextLayerFetcher[] = [];

  if (deps?.simpleMemoryService) {
    settingsSubFetchers.push(
      createMemoryInjectionFetcher({
        simpleMemoryService: deps.simpleMemoryService,
        logger: deps.logger,
        degradationCounter,
        degradationEscalationThreshold: deps.degradationEscalationThreshold,
      }),
    );
  }

  // L1 session-aware memory injection (INV-4: FTS5 keyword matching, no extra vector store).
  // Injected after L0 (simpleMemoryService) so that always-inject core takes priority.
  if (deps?.sessionMemoryService) {
    settingsSubFetchers.push(
      createSessionMemoryFetcher({
        sessionMemoryService: deps.sessionMemoryService,
        sessionId: deps.activeSessionId,
        logger: deps.logger,
        degradationCounter,
        degradationEscalationThreshold: deps.degradationEscalationThreshold,
      }),
    );
  }

  if (deps?.projectService) {
    settingsSubFetchers.push(
      createProjectStyleFetcher({
        projectService: deps.projectService,
        logger: deps.logger,
        degradationCounter,
        degradationEscalationThreshold: deps.degradationEscalationThreshold,
      }),
    );
  }

  if (deps?.characterListService) {
    settingsSubFetchers.push(
      createCharacterContextFetcher({
        characterListService: deps.characterListService,
        logger: deps.logger,
        degradationCounter,
        degradationEscalationThreshold: deps.degradationEscalationThreshold,
      }),
    );
  }

  const compositeSettingsFetcher: ContextLayerFetcher =
    settingsSubFetchers.length > 0
      ? async (request) => {
          const results = await Promise.all(
            settingsSubFetchers.map((fetcher) =>
              fetcher(request).catch((): { chunks: ContextLayerChunk[]; warnings: string[] } => ({
                chunks: [],
                warnings: ["SETTINGS_SUBFETCHER_DEGRADED"],
              })),
            ),
          );
          return {
            chunks: results.flatMap((r) => r.chunks),
            truncated: results.some((r) => "truncated" in r && r.truncated === true),
            warnings: results.flatMap((r) => r.warnings ?? []),
          };
        }
      : async () => ({ chunks: [] });

  return {
    rules: deps?.kgService
      ? createRulesFetcher({
          kgService: deps.kgService,
          logger: deps.logger,
          degradationCounter,
          degradationEscalationThreshold: deps.degradationEscalationThreshold,
        })
      : fallbackRulesFetcher,
    settings: compositeSettingsFetcher,
    retrieved: async () => ({ chunks: [] }),
    immediate: async (request) => {
      const text = request.additionalInput;
      let content: string;
      if (text !== undefined && text.length > 0) {
        if (request.additionalInputIsSelection) {
          content = text;
        } else {
          const sliceAt =
            request.textOffset !== undefined ? request.textOffset : request.cursorPosition;
          const pos = Math.min(sliceAt, text.length);
          const preceding = text.slice(0, pos);
          content =
            preceding.length > 0
              ? preceding
              : `cursor=${request.cursorPosition.toString()}`;
        }
      } else {
        content = `cursor=${request.cursorPosition.toString()}`;
      }
      return {
        chunks: [{ source: "editor:cursor-window", content }],
      };
    },
  };
}

/**
 * Create a deterministic Context Layer Assembly service.
 *
 * Why: CE2 needs fixed token budgets plus updateable profile contract while
 * keeping CE1 assemble/inspect behavior stable for downstream callers.
 */
export function createContextLayerAssemblyService(
  fetchers?: Partial<ContextLayerFetcherMap>,
  deps?: ContextLayerAssemblyDeps,
): ContextLayerAssemblyService {
  const fetcherMap = {
    ...defaultFetchers({
      kgService: deps?.kgService,
      memoryService: deps?.memoryService,
      simpleMemoryService: deps?.simpleMemoryService,
      sessionMemoryService: deps?.sessionMemoryService,
      activeSessionId: deps?.activeSessionId,
      projectService: deps?.projectService,
      characterListService: deps?.characterListService,
      synopsisStore: deps?.synopsisStore,
      episodicMemoryService: deps?.episodicMemoryService,
      matchEntities: deps?.matchEntities,
      logger: deps?.logger,
      degradationCounter: deps?.degradationCounter,
      degradationEscalationThreshold: deps?.degradationEscalationThreshold,
    }),
    ...(fetchers ?? {}),
  };
  const previousStablePrefixByRequest = new Map<string, string>();
  let budgetProfile = buildDefaultBudgetProfile();

  return {
    assemble: async (request) => {
      const snapshot = await buildContextSnapshot({
        request,
        fetchers: fetcherMap,
        budgetProfile,
        onConstraintTrim: deps?.onConstraintTrim,
      });

      const cacheKey = keyForStablePrefix({
        request,
        tokenizerVersion: budgetProfile.tokenizerVersion,
      });
      const previousHash = previousStablePrefixByRequest.get(cacheKey);
      const stablePrefixUnchanged = previousHash === snapshot.stablePrefixHash;
      previousStablePrefixByRequest.set(cacheKey, snapshot.stablePrefixHash);

      return {
        prompt: snapshot.prompt,
        tokenCount: snapshot.tokenCount,
        stablePrefixHash: snapshot.stablePrefixHash,
        stablePrefixUnchanged,
        warnings: snapshot.warnings,
        compressionApplied: snapshot.compressionApplied,
        capacityPercent: calculateCapacityPercent(
          snapshot.tokenCount,
          budgetProfile.totalBudgetTokens,
        ),
        layers: buildPublicAssembleLayers({
          rules: snapshot.layersDetail.rules,
          compressedHistory: snapshot.compressedHistory,
          immediate: snapshot.layersDetail.immediate,
        }),
      };
    },
    inspect: async (request) => {
      const snapshot = await buildContextSnapshot({
        request,
        fetchers: fetcherMap,
        budgetProfile,
        onConstraintTrim: deps?.onConstraintTrim,
      });

      return {
        layersDetail: buildPublicInspectLayers({
          rules: snapshot.layersDetail.rules,
          compressedHistory: snapshot.compressedHistory,
          immediate: snapshot.layersDetail.immediate,
        }),
        totals: {
          tokenCount: snapshot.tokenCount,
          warningsCount: snapshot.warnings.length,
        },
        inspectMeta: {
          debugMode: request.debugMode === true,
          requestedBy: request.requestedBy ?? "unknown",
          requestedAt: Date.now(),
        },
      };
    },
    getBudgetProfile: () => cloneBudgetProfile(budgetProfile),
    updateBudgetProfile: (request) => {
      if (request.version !== budgetProfile.version) {
        return {
          ok: false,
          error: {
            code: "CONTEXT_BUDGET_CONFLICT",
            message: "Budget profile version conflict",
          },
        };
      }

      if (
        request.tokenizerId !== budgetProfile.tokenizerId ||
        request.tokenizerVersion !== budgetProfile.tokenizerVersion
      ) {
        return {
          ok: false,
          error: {
            code: "CONTEXT_TOKENIZER_MISMATCH",
            message: "Tokenizer metadata does not match context tokenizer",
          },
        };
      }

      const validationError = validateBudgetUpdateInput(request.layers);
      if (validationError) {
        return validationError;
      }

      budgetProfile = {
        ...cloneBudgetProfile(budgetProfile),
        version: budgetProfile.version + 1,
        layers: {
          rules: { ...request.layers.rules },
          settings: { ...request.layers.settings },
          retrieved: { ...request.layers.retrieved },
          immediate: { ...request.layers.immediate },
        },
      };

      return { ok: true, data: cloneBudgetProfile(budgetProfile) };
    },
  };
}
