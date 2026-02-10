import { createHash } from "node:crypto";

export type ContextLayerId = "rules" | "settings" | "retrieved" | "immediate";

export type ContextAssembleRequest = {
  projectId: string;
  documentId: string;
  cursorPosition: number;
  skillId: string;
  additionalInput?: string;
  provider?: string;
  model?: string;
  tokenizerVersion?: string;
};

export type ContextInspectRequest = ContextAssembleRequest & {
  debugMode?: boolean;
  requestedBy?: string;
};

export type ContextLayerChunk = {
  source: string;
  content: string;
};

export type ContextLayerFetchResult = {
  chunks: ContextLayerChunk[];
  truncated?: boolean;
  warnings?: string[];
};

export type ContextLayerFetcher = (
  request: ContextAssembleRequest,
) => Promise<ContextLayerFetchResult>;

export type ContextLayerFetcherMap = {
  rules: ContextLayerFetcher;
  settings: ContextLayerFetcher;
  retrieved: ContextLayerFetcher;
  immediate: ContextLayerFetcher;
};

export type ContextLayerSummary = {
  source: string[];
  tokenCount: number;
  truncated: boolean;
  warnings?: string[];
};

export type ContextLayerDetail = ContextLayerSummary & {
  content: string;
};

export type ContextAssembleResult = {
  prompt: string;
  tokenCount: number;
  stablePrefixHash: string;
  stablePrefixUnchanged: boolean;
  warnings: string[];
  assemblyOrder: ContextLayerId[];
  layers: Record<ContextLayerId, ContextLayerSummary>;
};

export type ContextInspectResult = {
  layersDetail: Record<ContextLayerId, ContextLayerDetail>;
  totals: {
    tokenCount: number;
    warningsCount: number;
  };
  inspectMeta: {
    debugMode: boolean;
    requestedBy: string;
    requestedAt: number;
  };
};

export type ContextBudgetLayerConfig = {
  ratio: number;
  minimumTokens: number;
};

export type ContextBudgetProfile = {
  version: number;
  tokenizerId: string;
  tokenizerVersion: string;
  totalBudgetTokens: number;
  layers: Record<ContextLayerId, ContextBudgetLayerConfig>;
};

export type ContextBudgetUpdateRequest = {
  version: number;
  tokenizerId: string;
  tokenizerVersion: string;
  layers: Record<ContextLayerId, ContextBudgetLayerConfig>;
};

export type ContextBudgetUpdateErrorCode =
  | "CONTEXT_BUDGET_INVALID_RATIO"
  | "CONTEXT_BUDGET_INVALID_MINIMUM"
  | "CONTEXT_BUDGET_CONFLICT"
  | "CONTEXT_TOKENIZER_MISMATCH";

export type ContextBudgetUpdateResult =
  | { ok: true; data: ContextBudgetProfile }
  | {
      ok: false;
      error: { code: ContextBudgetUpdateErrorCode; message: string };
    };

export type ContextLayerAssemblyService = {
  assemble: (request: ContextAssembleRequest) => Promise<ContextAssembleResult>;
  inspect: (request: ContextInspectRequest) => Promise<ContextInspectResult>;
  getBudgetProfile: () => ContextBudgetProfile;
  updateBudgetProfile: (
    request: ContextBudgetUpdateRequest,
  ) => ContextBudgetUpdateResult;
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

const DEFAULT_TOTAL_BUDGET_TOKENS = 6000;
const DEFAULT_TOKENIZER_ID = "cn-byte-estimator";
const DEFAULT_TOKENIZER_VERSION = "1.0.0";
const NON_DETERMINISTIC_PREFIX_FIELDS = new Set([
  "timestamp",
  "requestId",
  "nonce",
]);

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
 * Why: CE2 requires deterministic token math without external tokenizer
 * dependencies during local tests and CI.
 */
function estimateTokenCount(text: string): number {
  const bytes = new TextEncoder().encode(text).length;
  return bytes === 0 ? 0 : Math.ceil(bytes / 4);
}

/**
 * Why: truncation must be deterministic and bounded by token budget.
 */
function trimTextToTokenBudget(text: string, tokenBudget: number): string {
  const maxBytes = Math.max(0, Math.floor(tokenBudget * 4));
  if (maxBytes === 0) {
    return "";
  }

  const buffer = new TextEncoder().encode(text);
  if (buffer.length <= maxBytes) {
    return text;
  }

  return new TextDecoder().decode(buffer.slice(0, maxBytes));
}

/**
 * Why: layer chunks from heterogeneous sources need one stable merge strategy so
 * inspect and assemble views remain aligned.
 */
function mergeLayerContent(chunks: readonly ContextLayerChunk[]): string {
  return chunks
    .map((chunk) => chunk.content.trim())
    .filter((content) => content.length > 0)
    .join("\n\n");
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
  settingsContent: string,
): string {
  const canonicalizedPayload = canonicalizeStablePrefixValue({
    rules: canonicalizeLayerForStablePrefix(rulesContent),
    settings: canonicalizeLayerForStablePrefix(settingsContent),
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
  layer: ContextLayerId;
  content: string;
}): string {
  const title = args.layer[0].toUpperCase() + args.layer.slice(1);
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
}): Promise<ContextLayerDetail> {
  try {
    const fetched = await args.fetcher(args.request);
    const source = uniqueNonEmpty(fetched.chunks.map((chunk) => chunk.source));
    const content = mergeLayerContent(fetched.chunks);
    const warnings = uniqueNonEmpty(fetched.warnings ?? []);

    return {
      content,
      source,
      tokenCount: estimateTokenCount(content),
      truncated: fetched.truncated === true,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  } catch {
    const warning = LAYER_DEGRADED_WARNING[args.layer];
    return {
      content: "",
      source: [],
      tokenCount: 0,
      truncated: false,
      warnings: [warning],
    };
  }
}

/**
 * Why: mutable layer transforms must not mutate upstream fetch outputs.
 */
function cloneLayerDetail(layer: ContextLayerDetail): ContextLayerDetail {
  return {
    content: layer.content,
    source: [...layer.source],
    tokenCount: layer.tokenCount,
    truncated: layer.truncated,
    ...(layer.warnings ? { warnings: [...layer.warnings] } : {}),
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
  layers: Record<ContextLayerId, ContextLayerDetail>,
): number {
  return (
    layers.rules.tokenCount +
    layers.settings.tokenCount +
    layers.retrieved.tokenCount +
    layers.immediate.tokenCount
  );
}

/**
 * Why: CE2 requires fixed truncation order and a non-trimmable Rules layer.
 */
function applyBudgetToLayers(args: {
  layers: Record<ContextLayerId, ContextLayerDetail>;
  budgetProfile: ContextBudgetProfile;
}): {
  layers: Record<ContextLayerId, ContextLayerDetail>;
  warnings: string[];
} {
  const layers: Record<ContextLayerId, ContextLayerDetail> = {
    rules: cloneLayerDetail(args.layers.rules),
    settings: cloneLayerDetail(args.layers.settings),
    retrieved: cloneLayerDetail(args.layers.retrieved),
    immediate: cloneLayerDetail(args.layers.immediate),
  };
  const warnings: string[] = [];
  const layerCaps = deriveLayerBudgetCaps(args.budgetProfile);

  if (layers.rules.tokenCount > layerCaps.rules) {
    warnings.push("CONTEXT_RULES_OVERBUDGET");
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
 * Why: `source` and `tokenCount` are hard-required fields in CE contract.
 */
function validateLayerContract(layer: ContextLayerDetail): void {
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
}): Promise<{
  layersDetail: Record<ContextLayerId, ContextLayerDetail>;
  warnings: string[];
  prompt: string;
  tokenCount: number;
  stablePrefixHash: string;
}> {
  const rules = await fetchLayerWithDegrade({
    layer: "rules",
    request: args.request,
    fetcher: args.fetchers.rules,
  });
  const settings = await fetchLayerWithDegrade({
    layer: "settings",
    request: args.request,
    fetcher: args.fetchers.settings,
  });
  const retrieved = await fetchLayerWithDegrade({
    layer: "retrieved",
    request: args.request,
    fetcher: args.fetchers.retrieved,
  });
  const immediate = await fetchLayerWithDegrade({
    layer: "immediate",
    request: args.request,
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
  });

  const warnings = uniqueNonEmpty([
    ...(budgetApplied.layers.rules.warnings ?? []),
    ...(budgetApplied.layers.settings.warnings ?? []),
    ...(budgetApplied.layers.retrieved.warnings ?? []),
    ...(budgetApplied.layers.immediate.warnings ?? []),
    ...budgetApplied.warnings,
  ]);

  const prompt = [
    toLayerPrompt({
      layer: "rules",
      content: budgetApplied.layers.rules.content,
    }),
    toLayerPrompt({
      layer: "settings",
      content: budgetApplied.layers.settings.content,
    }),
    toLayerPrompt({
      layer: "retrieved",
      content: budgetApplied.layers.retrieved.content,
    }),
    toLayerPrompt({
      layer: "immediate",
      content: budgetApplied.layers.immediate.content,
    }),
  ].join("\n\n");

  return {
    layersDetail: budgetApplied.layers,
    warnings,
    prompt,
    tokenCount: totalLayerTokens(budgetApplied.layers),
    stablePrefixHash: hashStablePrefix(
      budgetApplied.layers.rules.content,
      budgetApplied.layers.settings.content,
    ),
  };
}

/**
 * Why: deterministic defaults keep context IPC callable before RAG/KG/Memory
 * integrations are fully wired.
 */
function defaultFetchers(): ContextLayerFetcherMap {
  return {
    rules: async (request) => ({
      chunks: [
        {
          source: "kg:entities",
          content: `Skill ${request.skillId} must follow project rules.`,
        },
      ],
    }),
    settings: async () => ({
      chunks: [],
    }),
    retrieved: async () => ({
      chunks: [],
    }),
    immediate: async (request) => ({
      chunks: [
        {
          source: "editor:cursor-window",
          content:
            request.additionalInput?.trim() ??
            `cursor=${request.cursorPosition.toString()}`,
        },
      ],
    }),
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
): ContextLayerAssemblyService {
  const fetcherMap = {
    ...defaultFetchers(),
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
        assemblyOrder: [...LAYER_ORDER],
        layers: {
          rules: layerSummary(snapshot.layersDetail.rules),
          settings: layerSummary(snapshot.layersDetail.settings),
          retrieved: layerSummary(snapshot.layersDetail.retrieved),
          immediate: layerSummary(snapshot.layersDetail.immediate),
        },
      };
    },
    inspect: async (request) => {
      const snapshot = await buildContextSnapshot({
        request,
        fetchers: fetcherMap,
        budgetProfile,
      });

      return {
        layersDetail: snapshot.layersDetail,
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
