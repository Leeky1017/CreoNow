import { createHash } from "node:crypto";

export type ContextLayerId = "rules" | "settings" | "retrieved" | "immediate";

export type ContextAssembleRequest = {
  projectId: string;
  documentId: string;
  cursorPosition: number;
  skillId: string;
  additionalInput?: string;
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

export type ContextLayerAssemblyService = {
  assemble: (request: ContextAssembleRequest) => Promise<ContextAssembleResult>;
  inspect: (request: ContextInspectRequest) => Promise<ContextInspectResult>;
};

const LAYER_ORDER: ContextLayerId[] = [
  "rules",
  "settings",
  "retrieved",
  "immediate",
];

const LAYER_DEGRADED_WARNING: Record<ContextLayerId, string> = {
  rules: "KG_UNAVAILABLE",
  settings: "SETTINGS_UNAVAILABLE",
  retrieved: "RAG_UNAVAILABLE",
  immediate: "IMMEDIATE_UNAVAILABLE",
};

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
 * Why: P0 contract only needs a deterministic approximation without model-bound
 * tokenizer dependencies.
 */
function estimateTokenCount(text: string): number {
  const bytes = new TextEncoder().encode(text).length;
  return bytes === 0 ? 0 : Math.ceil(bytes / 4);
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
 * Why: stable prefix state must be content-addressed and deterministic across
 * process restarts.
 */
function hashStablePrefix(
  rulesContent: string,
  settingsContent: string,
): string {
  return createHash("sha256")
    .update(rulesContent, "utf8")
    .update("\n---\n", "utf8")
    .update(settingsContent, "utf8")
    .digest("hex");
}

/**
 * Why: unchanged detection is request-scoped; this avoids cross-document cache
 * pollution during rapid multi-tab editing.
 */
function keyForStablePrefix(request: ContextAssembleRequest): string {
  return `${request.projectId}:${request.documentId}:${request.skillId}`;
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
 * Why: `source` and `tokenCount` are hard-required fields in CE-P0 contract.
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

  const warnings = uniqueNonEmpty([
    ...(rules.warnings ?? []),
    ...(settings.warnings ?? []),
    ...(retrieved.warnings ?? []),
    ...(immediate.warnings ?? []),
  ]);

  const prompt = [
    toLayerPrompt({ layer: "rules", content: rules.content }),
    toLayerPrompt({ layer: "settings", content: settings.content }),
    toLayerPrompt({ layer: "retrieved", content: retrieved.content }),
    toLayerPrompt({ layer: "immediate", content: immediate.content }),
  ].join("\n\n");

  const tokenCount =
    rules.tokenCount +
    settings.tokenCount +
    retrieved.tokenCount +
    immediate.tokenCount;

  return {
    layersDetail: {
      rules,
      settings,
      retrieved,
      immediate,
    },
    warnings,
    prompt,
    tokenCount,
    stablePrefixHash: hashStablePrefix(rules.content, settings.content),
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
 * Create a deterministic Context Layer Assembly service for P0 contract flow.
 *
 * Why: P0 needs a stable and testable assembly API before budget/hash/constraint
 * extensions land in follow-up changes.
 */
export function createContextLayerAssemblyService(
  fetchers?: Partial<ContextLayerFetcherMap>,
): ContextLayerAssemblyService {
  const fetcherMap = {
    ...defaultFetchers(),
    ...(fetchers ?? {}),
  };
  const previousStablePrefixByRequest = new Map<string, string>();

  return {
    assemble: async (request) => {
      const snapshot = await buildContextSnapshot({
        request,
        fetchers: fetcherMap,
      });

      const cacheKey = keyForStablePrefix(request);
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
  };
}
