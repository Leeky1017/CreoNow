import { s } from "./schema";

export const IPC_ERROR_CODES = [
  "VALIDATION_ERROR",
  "IPC_TIMEOUT",
  "IPC_CHANNEL_FORBIDDEN",
  "IPC_PAYLOAD_TOO_LARGE",
  "IPC_SUBSCRIPTION_LIMIT_EXCEEDED",
  "INTERNAL_ERROR",
  "INVALID_ARGUMENT",
  "NOT_FOUND",
  "ALREADY_EXISTS",
  "CONFLICT",
  "PERMISSION_DENIED",
  "UNSUPPORTED",
  "IO_ERROR",
  "DB_ERROR",
  "MEMORY_EPISODE_WRITE_FAILED",
  "MEMORY_CAPACITY_EXCEEDED",
  "MEMORY_DISTILL_LLM_UNAVAILABLE",
  "MEMORY_CONFIDENCE_OUT_OF_RANGE",
  "MEMORY_CLEAR_CONFIRM_REQUIRED",
  "MEMORY_TRACE_MISMATCH",
  "MEMORY_SCOPE_DENIED",
  "MODEL_NOT_READY",
  "ENCODING_FAILED",
  "RATE_LIMITED",
  "TIMEOUT",
  "CANCELED",
  "UPSTREAM_ERROR",
  "INTERNAL",
  "PROJECT_CAPACITY_EXCEEDED",
  "PROJECT_DELETE_REQUIRES_ARCHIVE",
  "PROJECT_METADATA_INVALID_ENUM",
  "PROJECT_PURGE_PERMISSION_DENIED",
  "PROJECT_LIFECYCLE_WRITE_FAILED",
  "PROJECT_IPC_SCHEMA_INVALID",
  "KG_ATTRIBUTE_KEYS_EXCEEDED",
  "KG_CAPACITY_EXCEEDED",
  "KG_ENTITY_CONFLICT",
  "KG_ENTITY_DUPLICATE",
  "KG_QUERY_TIMEOUT",
  "KG_RECOGNITION_UNAVAILABLE",
  "KG_RELEVANT_QUERY_FAILED",
  "KG_RELATION_INVALID",
  "KG_SCOPE_VIOLATION",
  "KG_SUBGRAPH_K_EXCEEDED",
  "PROJECT_SWITCH_TIMEOUT",
  "DOCUMENT_SAVE_CONFLICT",
  "MEMORY_BACKPRESSURE",
  "SKILL_TIMEOUT",
  "AI_AUTH_FAILED",
  "AI_NOT_CONFIGURED",
  "AI_RATE_LIMITED",
  "LLM_API_ERROR",
  "AI_PROVIDER_UNAVAILABLE",
  "VERSION_MERGE_TIMEOUT",
  "SEARCH_TIMEOUT",
  "CONTEXT_SCOPE_VIOLATION",
] as const;

export type IpcErrorCode = (typeof IPC_ERROR_CODES)[number];

const IPC_ERROR_CODE_SCHEMA = s.union(
  ...IPC_ERROR_CODES.map((code) => s.literal(code)),
);

const JUDGE_MODEL_STATE_SCHEMA = s.union(
  s.object({ status: s.literal("not_ready") }),
  s.object({ status: s.literal("downloading") }),
  s.object({ status: s.literal("ready") }),
  s.object({
    status: s.literal("error"),
    error: s.object({ code: IPC_ERROR_CODE_SCHEMA, message: s.string() }),
  }),
);

const SKILL_SCOPE_SCHEMA = s.union(
  s.literal("builtin"),
  s.literal("global"),
  s.literal("project"),
);

const SKILL_LIST_ITEM_SCHEMA = s.object({
  id: s.string(),
  name: s.string(),
  scope: SKILL_SCOPE_SCHEMA,
  packageId: s.string(),
  version: s.string(),
  enabled: s.boolean(),
  valid: s.boolean(),
  error_code: s.optional(IPC_ERROR_CODE_SCHEMA),
  error_message: s.optional(s.string()),
});

const CREONOW_LIST_ITEM_SCHEMA = s.object({
  path: s.string(),
  sizeBytes: s.number(),
  updatedAtMs: s.number(),
});

const CONTEXT_LAYER_ID_SCHEMA = s.union(
  s.literal("rules"),
  s.literal("settings"),
  s.literal("retrieved"),
  s.literal("immediate"),
);

const CONTEXT_ASSEMBLE_REQUEST_SCHEMA = s.object({
  projectId: s.string(),
  documentId: s.string(),
  cursorPosition: s.number(),
  skillId: s.string(),
  additionalInput: s.optional(s.string()),
});

const CONTEXT_INSPECT_REQUEST_SCHEMA = s.object({
  projectId: s.string(),
  documentId: s.string(),
  cursorPosition: s.number(),
  skillId: s.string(),
  additionalInput: s.optional(s.string()),
  debugMode: s.optional(s.boolean()),
  requestedBy: s.optional(s.string()),
});

const CONTEXT_LAYER_SUMMARY_SCHEMA = s.object({
  source: s.array(s.string()),
  tokenCount: s.number(),
  truncated: s.boolean(),
  warnings: s.optional(s.array(s.string())),
});

const CONTEXT_LAYER_DETAIL_SCHEMA = s.object({
  content: s.string(),
  source: s.array(s.string()),
  tokenCount: s.number(),
  truncated: s.boolean(),
  warnings: s.optional(s.array(s.string())),
});

const CONTEXT_ASSEMBLE_RESPONSE_SCHEMA = s.object({
  prompt: s.string(),
  tokenCount: s.number(),
  stablePrefixHash: s.string(),
  stablePrefixUnchanged: s.boolean(),
  warnings: s.array(s.string()),
  assemblyOrder: s.array(CONTEXT_LAYER_ID_SCHEMA),
  layers: s.object({
    rules: CONTEXT_LAYER_SUMMARY_SCHEMA,
    settings: CONTEXT_LAYER_SUMMARY_SCHEMA,
    retrieved: CONTEXT_LAYER_SUMMARY_SCHEMA,
    immediate: CONTEXT_LAYER_SUMMARY_SCHEMA,
  }),
});

const CONTEXT_INSPECT_RESPONSE_SCHEMA = s.object({
  layersDetail: s.object({
    rules: CONTEXT_LAYER_DETAIL_SCHEMA,
    settings: CONTEXT_LAYER_DETAIL_SCHEMA,
    retrieved: CONTEXT_LAYER_DETAIL_SCHEMA,
    immediate: CONTEXT_LAYER_DETAIL_SCHEMA,
  }),
  totals: s.object({
    tokenCount: s.number(),
    warningsCount: s.number(),
  }),
  inspectMeta: s.object({
    debugMode: s.boolean(),
    requestedBy: s.string(),
    requestedAt: s.number(),
  }),
});

const SEARCH_FTS_HIGHLIGHT_SCHEMA = s.object({
  start: s.number(),
  end: s.number(),
});

const SEARCH_FTS_ANCHOR_SCHEMA = s.object({
  start: s.number(),
  end: s.number(),
});

const SEARCH_FTS_ITEM_SCHEMA = s.object({
  projectId: s.string(),
  documentId: s.string(),
  documentTitle: s.string(),
  documentType: s.string(),
  snippet: s.string(),
  highlights: s.array(SEARCH_FTS_HIGHLIGHT_SCHEMA),
  anchor: SEARCH_FTS_ANCHOR_SCHEMA,
  score: s.number(),
  updatedAt: s.number(),
});

const SEARCH_SEMANTIC_ITEM_SCHEMA = s.object({
  documentId: s.string(),
  chunkId: s.optional(s.string()),
  snippet: s.string(),
  score: s.number(),
});

const RAG_RETRIEVE_ITEM_SCHEMA = s.object({
  sourceRef: s.string(),
  snippet: s.string(),
  score: s.number(),
});

const RAG_RETRIEVE_DIAGNOSTICS_SCHEMA = s.object({
  budgetTokens: s.number(),
  usedTokens: s.number(),
  droppedCount: s.number(),
  trimmedCount: s.number(),
  mode: s.union(s.literal("fulltext"), s.literal("fulltext_reranked")),
  planner: s.object({
    queries: s.array(s.string()),
    perQueryHits: s.array(s.number()),
    selectedQuery: s.string(),
    selectedCount: s.number(),
  }),
  rerank: s.object({
    enabled: s.boolean(),
    reason: s.optional(s.string()),
    model: s.optional(s.string()),
  }),
  degradedFrom: s.optional(s.literal("semantic")),
  reason: s.optional(s.string()),
});

const STATS_SUMMARY_SCHEMA = s.object({
  wordsWritten: s.number(),
  writingSeconds: s.number(),
  skillsUsed: s.number(),
  documentsCreated: s.number(),
});

const STATS_DAY_SCHEMA = s.object({
  date: s.string(),
  summary: STATS_SUMMARY_SCHEMA,
});

const PROJECT_TYPE_SCHEMA = s.union(
  s.literal("novel"),
  s.literal("screenplay"),
  s.literal("media"),
);

const PROJECT_STAGE_SCHEMA = s.union(
  s.literal("outline"),
  s.literal("draft"),
  s.literal("revision"),
  s.literal("final"),
);

const PROJECT_LIFECYCLE_STATE_SCHEMA = s.union(
  s.literal("active"),
  s.literal("archived"),
  s.literal("deleted"),
);

const EXPORT_RESULT_SCHEMA = s.object({
  relativePath: s.string(),
  bytesWritten: s.number(),
});

const AI_PROMPT_DIAGNOSTICS_SCHEMA = s.object({
  stablePrefixHash: s.string(),
  promptHash: s.string(),
});

const AI_PROXY_SETTINGS_SCHEMA = s.object({
  enabled: s.boolean(),
  baseUrl: s.string(),
  apiKeyConfigured: s.boolean(),
  providerMode: s.union(
    s.literal("openai-compatible"),
    s.literal("openai-byok"),
    s.literal("anthropic-byok"),
  ),
  openAiCompatibleBaseUrl: s.string(),
  openAiCompatibleApiKeyConfigured: s.boolean(),
  openAiByokBaseUrl: s.string(),
  openAiByokApiKeyConfigured: s.boolean(),
  anthropicByokBaseUrl: s.string(),
  anthropicByokApiKeyConfigured: s.boolean(),
});

const AI_PROXY_TEST_SCHEMA = s.object({
  ok: s.boolean(),
  latencyMs: s.number(),
  error: s.optional(
    s.object({
      code: IPC_ERROR_CODE_SCHEMA,
      message: s.string(),
    }),
  ),
});

const AI_MODEL_CATALOG_ITEM_SCHEMA = s.object({
  id: s.string(),
  name: s.string(),
  provider: s.string(),
});

const AI_MODEL_CATALOG_SCHEMA = s.object({
  source: s.union(
    s.literal("proxy"),
    s.literal("openai"),
    s.literal("anthropic"),
  ),
  items: s.array(AI_MODEL_CATALOG_ITEM_SCHEMA),
});

const REDACTION_EVIDENCE_SCHEMA = s.object({
  patternId: s.string(),
  sourceRef: s.string(),
  matchCount: s.number(),
});

const MEMORY_TYPE_SCHEMA = s.union(
  s.literal("preference"),
  s.literal("fact"),
  s.literal("note"),
);

const MEMORY_SCOPE_SCHEMA = s.union(
  s.literal("global"),
  s.literal("project"),
  s.literal("document"),
);

const MEMORY_ORIGIN_SCHEMA = s.union(s.literal("manual"), s.literal("learned"));

const MEMORY_SETTINGS_SCHEMA = s.object({
  injectionEnabled: s.boolean(),
  preferenceLearningEnabled: s.boolean(),
  privacyModeEnabled: s.boolean(),
  preferenceLearningThreshold: s.number(),
});

const MEMORY_INJECTION_REASON_SCHEMA = s.union(
  s.object({ kind: s.literal("deterministic") }),
  s.object({ kind: s.literal("semantic"), score: s.number() }),
);

const MEMORY_INJECTION_ITEM_SCHEMA = s.object({
  id: s.string(),
  type: MEMORY_TYPE_SCHEMA,
  scope: MEMORY_SCOPE_SCHEMA,
  origin: MEMORY_ORIGIN_SCHEMA,
  content: s.string(),
  reason: MEMORY_INJECTION_REASON_SCHEMA,
});

const MEMORY_IMPLICIT_SIGNAL_SCHEMA = s.union(
  s.literal("DIRECT_ACCEPT"),
  s.literal("LIGHT_EDIT"),
  s.literal("HEAVY_REWRITE"),
  s.literal("FULL_REJECT"),
  s.literal("UNDO_AFTER_ACCEPT"),
  s.literal("REPEATED_SCENE_SKILL"),
);

const MEMORY_EPISODE_SCHEMA = s.object({
  id: s.string(),
  projectId: s.string(),
  scope: s.literal("project"),
  version: s.literal(1),
  chapterId: s.string(),
  sceneType: s.string(),
  skillUsed: s.string(),
  inputContext: s.string(),
  candidates: s.array(s.string()),
  selectedIndex: s.number(),
  finalText: s.string(),
  explicit: s.optional(s.string()),
  editDistance: s.number(),
  implicitSignal: MEMORY_IMPLICIT_SIGNAL_SCHEMA,
  implicitWeight: s.number(),
  importance: s.number(),
  recallCount: s.number(),
  lastRecalledAt: s.optional(s.number()),
  compressed: s.boolean(),
  userConfirmed: s.boolean(),
  createdAt: s.number(),
  updatedAt: s.number(),
});

const MEMORY_SEMANTIC_RULE_PLACEHOLDER_SCHEMA = s.object({
  id: s.string(),
  projectId: s.string(),
  scope: s.union(s.literal("project"), s.literal("global")),
  version: s.literal(1),
  rule: s.string(),
  confidence: s.number(),
  createdAt: s.number(),
  updatedAt: s.number(),
});

const MEMORY_SEMANTIC_CATEGORY_SCHEMA = s.union(
  s.literal("style"),
  s.literal("structure"),
  s.literal("character"),
  s.literal("pacing"),
  s.literal("vocabulary"),
);

const MEMORY_SEMANTIC_SCOPE_SCHEMA = s.union(
  s.literal("global"),
  s.literal("project"),
);

const MEMORY_SEMANTIC_RULE_SCHEMA = s.object({
  id: s.string(),
  projectId: s.string(),
  scope: MEMORY_SEMANTIC_SCOPE_SCHEMA,
  version: s.literal(1),
  rule: s.string(),
  category: MEMORY_SEMANTIC_CATEGORY_SCHEMA,
  confidence: s.number(),
  supportingEpisodes: s.array(s.string()),
  contradictingEpisodes: s.array(s.string()),
  userConfirmed: s.boolean(),
  userModified: s.boolean(),
  recentlyUpdated: s.optional(s.boolean()),
  conflictMarked: s.optional(s.boolean()),
  createdAt: s.number(),
  updatedAt: s.number(),
});

const MEMORY_CONFLICT_QUEUE_ITEM_SCHEMA = s.object({
  id: s.string(),
  ruleIds: s.array(s.string()),
  status: s.union(s.literal("pending"), s.literal("resolved")),
});

const MEMORY_DISTILL_TRIGGER_SCHEMA = s.union(
  s.literal("batch"),
  s.literal("idle"),
  s.literal("manual"),
  s.literal("conflict"),
);

const MEMORY_DISTILL_PROGRESS_SCHEMA = s.object({
  runId: s.string(),
  projectId: s.string(),
  trigger: MEMORY_DISTILL_TRIGGER_SCHEMA,
  stage: s.union(
    s.literal("started"),
    s.literal("clustered"),
    s.literal("patterned"),
    s.literal("generated"),
    s.literal("completed"),
    s.literal("failed"),
  ),
  progress: s.number(),
  message: s.optional(s.string()),
  errorCode: s.optional(IPC_ERROR_CODE_SCHEMA),
});

const MEMORY_TRACE_TYPE_SCHEMA = s.union(
  s.literal("working"),
  s.literal("episodic"),
  s.literal("semantic"),
);

const MEMORY_GENERATION_TRACE_SCHEMA = s.object({
  generationId: s.string(),
  projectId: s.string(),
  memoryReferences: s.object({
    working: s.array(s.string()),
    episodic: s.array(s.string()),
    semantic: s.array(s.string()),
  }),
  influenceWeights: s.array(
    s.object({
      memoryType: MEMORY_TRACE_TYPE_SCHEMA,
      referenceId: s.string(),
      weight: s.number(),
    }),
  ),
  createdAt: s.number(),
  updatedAt: s.number(),
});

const MEMORY_TRACE_FEEDBACK_VERDICT_SCHEMA = s.union(
  s.literal("correct"),
  s.literal("incorrect"),
);

const KG_ENTITY_TYPE_SCHEMA = s.union(
  s.literal("character"),
  s.literal("location"),
  s.literal("event"),
  s.literal("item"),
  s.literal("faction"),
);
const KG_ENTITY_SCHEMA = s.object({
  id: s.string(),
  projectId: s.string(),
  type: KG_ENTITY_TYPE_SCHEMA,
  name: s.string(),
  description: s.string(),
  attributes: s.record(s.string()),
  version: s.number(),
  createdAt: s.string(),
  updatedAt: s.string(),
});

const KG_RELATION_SCHEMA = s.object({
  id: s.string(),
  projectId: s.string(),
  sourceEntityId: s.string(),
  targetEntityId: s.string(),
  relationType: s.string(),
  description: s.string(),
  createdAt: s.string(),
});

const KG_RECOGNITION_ENQUEUE_SCHEMA = s.object({
  taskId: s.string(),
  status: s.union(s.literal("started"), s.literal("queued")),
  queuePosition: s.number(),
});

const KG_RECOGNITION_STATS_SCHEMA = s.object({
  running: s.number(),
  queued: s.number(),
  maxConcurrency: s.number(),
  peakRunning: s.number(),
  completed: s.number(),
  completionOrder: s.array(s.string()),
  canceledTaskIds: s.array(s.string()),
});

const KG_RULES_INJECTION_ENTITY_SCHEMA = s.object({
  id: s.string(),
  name: s.string(),
  type: KG_ENTITY_TYPE_SCHEMA,
  attributes: s.record(s.string()),
  relationsSummary: s.array(s.string()),
});

const KG_RULES_INJECTION_SCHEMA = s.object({
  injectedEntities: s.array(KG_RULES_INJECTION_ENTITY_SCHEMA),
  source: s.literal("kg-rules-mock"),
});

const DOCUMENT_TYPE_SCHEMA = s.union(
  s.literal("chapter"),
  s.literal("note"),
  s.literal("setting"),
  s.literal("timeline"),
  s.literal("character"),
);

const DOCUMENT_STATUS_SCHEMA = s.union(s.literal("draft"), s.literal("final"));

const DOCUMENT_LIST_ITEM_SCHEMA = s.object({
  documentId: s.string(),
  type: DOCUMENT_TYPE_SCHEMA,
  title: s.string(),
  status: DOCUMENT_STATUS_SCHEMA,
  sortOrder: s.number(),
  parentId: s.optional(s.string()),
  updatedAt: s.number(),
});

export const ipcContract = {
  version: 1,
  errorCodes: IPC_ERROR_CODES,
  channels: {
    "app:system:ping": {
      request: s.object({}),
      response: s.object({}),
    },
    "stats:day:gettoday": {
      request: s.object({}),
      response: STATS_DAY_SCHEMA,
    },
    "stats:range:get": {
      request: s.object({
        from: s.string(),
        to: s.string(),
      }),
      response: s.object({
        from: s.string(),
        to: s.string(),
        days: s.array(STATS_DAY_SCHEMA),
        summary: STATS_SUMMARY_SCHEMA,
      }),
    },
    "export:document:markdown": {
      request: s.object({
        projectId: s.string(),
        documentId: s.optional(s.string()),
      }),
      response: EXPORT_RESULT_SCHEMA,
    },
    "export:document:pdf": {
      request: s.object({
        projectId: s.string(),
        documentId: s.optional(s.string()),
      }),
      response: EXPORT_RESULT_SCHEMA,
    },
    "export:document:docx": {
      request: s.object({
        projectId: s.string(),
        documentId: s.optional(s.string()),
      }),
      response: EXPORT_RESULT_SCHEMA,
    },
    "export:document:txt": {
      request: s.object({
        projectId: s.string(),
        documentId: s.optional(s.string()),
      }),
      response: EXPORT_RESULT_SCHEMA,
    },
    "export:project:bundle": {
      request: s.object({
        projectId: s.string(),
      }),
      response: EXPORT_RESULT_SCHEMA,
    },
    "ai:chat:send": {
      request: s.object({
        message: s.string(),
        projectId: s.optional(s.string()),
        documentId: s.optional(s.string()),
      }),
      response: s.object({
        accepted: s.literal(true),
        messageId: s.string(),
        echoed: s.string(),
      }),
    },
    "ai:skill:run": {
      request: s.object({
        skillId: s.string(),
        input: s.string(),
        mode: s.union(s.literal("agent"), s.literal("plan"), s.literal("ask")),
        model: s.string(),
        context: s.optional(
          s.object({
            projectId: s.optional(s.string()),
            documentId: s.optional(s.string()),
          }),
        ),
        promptDiagnostics: s.optional(AI_PROMPT_DIAGNOSTICS_SCHEMA),
        stream: s.boolean(),
      }),
      response: s.object({
        runId: s.string(),
        outputText: s.optional(s.string()),
        promptDiagnostics: s.optional(AI_PROMPT_DIAGNOSTICS_SCHEMA),
      }),
    },
    "ai:config:get": {
      request: s.object({}),
      response: AI_PROXY_SETTINGS_SCHEMA,
    },
    "ai:config:update": {
      request: s.object({
        patch: s.object({
          enabled: s.optional(s.boolean()),
          baseUrl: s.optional(s.string()),
          apiKey: s.optional(s.string()),
          providerMode: s.optional(
            s.union(
              s.literal("openai-compatible"),
              s.literal("openai-byok"),
              s.literal("anthropic-byok"),
            ),
          ),
          openAiCompatibleBaseUrl: s.optional(s.string()),
          openAiCompatibleApiKey: s.optional(s.string()),
          openAiByokBaseUrl: s.optional(s.string()),
          openAiByokApiKey: s.optional(s.string()),
          anthropicByokBaseUrl: s.optional(s.string()),
          anthropicByokApiKey: s.optional(s.string()),
        }),
      }),
      response: AI_PROXY_SETTINGS_SCHEMA,
    },
    "ai:config:test": {
      request: s.object({}),
      response: AI_PROXY_TEST_SCHEMA,
    },
    "ai:models:list": {
      request: s.object({}),
      response: AI_MODEL_CATALOG_SCHEMA,
    },
    "ai:skill:cancel": {
      request: s.object({ runId: s.string() }),
      response: s.object({ canceled: s.literal(true) }),
    },
    "ai:skill:feedback": {
      request: s.object({
        runId: s.string(),
        action: s.union(
          s.literal("accept"),
          s.literal("reject"),
          s.literal("partial"),
        ),
        evidenceRef: s.string(),
      }),
      response: s.object({
        recorded: s.literal(true),
        learning: s.optional(
          s.object({
            ignored: s.boolean(),
            ignoredReason: s.optional(s.string()),
            learned: s.boolean(),
            learnedMemoryId: s.optional(s.string()),
            signalCount: s.optional(s.number()),
            threshold: s.optional(s.number()),
          }),
        ),
      }),
    },
    "memory:entry:create": {
      request: s.object({
        type: MEMORY_TYPE_SCHEMA,
        scope: MEMORY_SCOPE_SCHEMA,
        projectId: s.optional(s.string()),
        documentId: s.optional(s.string()),
        content: s.string(),
      }),
      response: s.object({
        memoryId: s.string(),
        type: MEMORY_TYPE_SCHEMA,
        scope: MEMORY_SCOPE_SCHEMA,
        projectId: s.optional(s.string()),
        documentId: s.optional(s.string()),
        origin: MEMORY_ORIGIN_SCHEMA,
        sourceRef: s.optional(s.string()),
        content: s.string(),
        createdAt: s.number(),
        updatedAt: s.number(),
        deletedAt: s.optional(s.number()),
      }),
    },
    "memory:entry:list": {
      request: s.object({
        projectId: s.optional(s.string()),
        documentId: s.optional(s.string()),
        includeDeleted: s.optional(s.boolean()),
      }),
      response: s.object({
        items: s.array(
          s.object({
            memoryId: s.string(),
            type: MEMORY_TYPE_SCHEMA,
            scope: MEMORY_SCOPE_SCHEMA,
            projectId: s.optional(s.string()),
            documentId: s.optional(s.string()),
            origin: MEMORY_ORIGIN_SCHEMA,
            sourceRef: s.optional(s.string()),
            content: s.string(),
            createdAt: s.number(),
            updatedAt: s.number(),
            deletedAt: s.optional(s.number()),
          }),
        ),
      }),
    },
    "memory:entry:update": {
      request: s.object({
        memoryId: s.string(),
        patch: s.object({
          type: s.optional(MEMORY_TYPE_SCHEMA),
          scope: s.optional(MEMORY_SCOPE_SCHEMA),
          projectId: s.optional(s.string()),
          documentId: s.optional(s.string()),
          content: s.optional(s.string()),
        }),
      }),
      response: s.object({
        memoryId: s.string(),
        type: MEMORY_TYPE_SCHEMA,
        scope: MEMORY_SCOPE_SCHEMA,
        projectId: s.optional(s.string()),
        documentId: s.optional(s.string()),
        origin: MEMORY_ORIGIN_SCHEMA,
        sourceRef: s.optional(s.string()),
        content: s.string(),
        createdAt: s.number(),
        updatedAt: s.number(),
        deletedAt: s.optional(s.number()),
      }),
    },
    "memory:entry:delete": {
      request: s.object({ memoryId: s.string() }),
      response: s.object({ deleted: s.literal(true) }),
    },
    "memory:settings:get": {
      request: s.object({}),
      response: MEMORY_SETTINGS_SCHEMA,
    },
    "memory:settings:update": {
      request: s.object({
        patch: s.object({
          injectionEnabled: s.optional(s.boolean()),
          preferenceLearningEnabled: s.optional(s.boolean()),
          privacyModeEnabled: s.optional(s.boolean()),
          preferenceLearningThreshold: s.optional(s.number()),
        }),
      }),
      response: MEMORY_SETTINGS_SCHEMA,
    },
    "memory:injection:preview": {
      request: s.object({
        projectId: s.optional(s.string()),
        documentId: s.optional(s.string()),
        queryText: s.optional(s.string()),
      }),
      response: s.object({
        items: s.array(MEMORY_INJECTION_ITEM_SCHEMA),
        mode: s.union(s.literal("deterministic"), s.literal("semantic")),
        diagnostics: s.optional(
          s.object({
            degradedFrom: s.literal("semantic"),
            reason: s.string(),
          }),
        ),
      }),
    },
    "memory:episode:record": {
      request: s.object({
        projectId: s.string(),
        chapterId: s.string(),
        sceneType: s.string(),
        skillUsed: s.string(),
        inputContext: s.string(),
        candidates: s.array(s.string()),
        selectedIndex: s.number(),
        finalText: s.string(),
        explicit: s.optional(s.string()),
        editDistance: s.number(),
        importance: s.optional(s.number()),
        acceptedWithoutEdit: s.optional(s.boolean()),
        undoAfterAccept: s.optional(s.boolean()),
        repeatedSceneSkillCount: s.optional(s.number()),
        userConfirmed: s.optional(s.boolean()),
        targetEpisodeId: s.optional(s.string()),
      }),
      response: s.object({
        accepted: s.literal(true),
        episodeId: s.string(),
        retryCount: s.number(),
        implicitSignal: MEMORY_IMPLICIT_SIGNAL_SCHEMA,
        implicitWeight: s.number(),
      }),
    },
    "memory:episode:query": {
      request: s.object({
        projectId: s.string(),
        sceneType: s.string(),
        queryText: s.optional(s.string()),
        limit: s.optional(s.number()),
      }),
      response: s.object({
        items: s.array(MEMORY_EPISODE_SCHEMA),
        memoryDegraded: s.boolean(),
        fallbackRules: s.array(s.string()),
        semanticRules: s.array(MEMORY_SEMANTIC_RULE_PLACEHOLDER_SCHEMA),
      }),
    },
    "memory:semantic:list": {
      request: s.object({
        projectId: s.string(),
      }),
      response: s.object({
        items: s.array(MEMORY_SEMANTIC_RULE_SCHEMA),
        conflictQueue: s.array(MEMORY_CONFLICT_QUEUE_ITEM_SCHEMA),
      }),
    },
    "memory:semantic:add": {
      request: s.object({
        projectId: s.string(),
        rule: s.string(),
        category: MEMORY_SEMANTIC_CATEGORY_SCHEMA,
        confidence: s.number(),
        scope: s.optional(MEMORY_SEMANTIC_SCOPE_SCHEMA),
        supportingEpisodes: s.optional(s.array(s.string())),
        contradictingEpisodes: s.optional(s.array(s.string())),
        userConfirmed: s.optional(s.boolean()),
        userModified: s.optional(s.boolean()),
      }),
      response: s.object({
        item: MEMORY_SEMANTIC_RULE_SCHEMA,
      }),
    },
    "memory:semantic:update": {
      request: s.object({
        projectId: s.string(),
        ruleId: s.string(),
        patch: s.object({
          rule: s.optional(s.string()),
          category: s.optional(MEMORY_SEMANTIC_CATEGORY_SCHEMA),
          confidence: s.optional(s.number()),
          scope: s.optional(MEMORY_SEMANTIC_SCOPE_SCHEMA),
          supportingEpisodes: s.optional(s.array(s.string())),
          contradictingEpisodes: s.optional(s.array(s.string())),
          userConfirmed: s.optional(s.boolean()),
          userModified: s.optional(s.boolean()),
        }),
      }),
      response: s.object({
        item: MEMORY_SEMANTIC_RULE_SCHEMA,
      }),
    },
    "memory:semantic:delete": {
      request: s.object({
        projectId: s.string(),
        ruleId: s.string(),
      }),
      response: s.object({
        deleted: s.literal(true),
      }),
    },
    "memory:scope:promote": {
      request: s.object({
        projectId: s.string(),
        ruleId: s.string(),
      }),
      response: s.object({
        item: MEMORY_SEMANTIC_RULE_SCHEMA,
      }),
    },
    "memory:clear:project": {
      request: s.object({
        projectId: s.string(),
        confirmed: s.boolean(),
      }),
      response: s.object({
        ok: s.literal(true),
        deletedEpisodes: s.number(),
        deletedRules: s.number(),
      }),
    },
    "memory:clear:all": {
      request: s.object({
        confirmed: s.boolean(),
      }),
      response: s.object({
        ok: s.literal(true),
        deletedEpisodes: s.number(),
        deletedRules: s.number(),
      }),
    },
    "memory:semantic:distill": {
      request: s.object({
        projectId: s.string(),
        trigger: s.optional(MEMORY_DISTILL_TRIGGER_SCHEMA),
      }),
      response: s.object({
        accepted: s.literal(true),
        runId: s.string(),
      }),
    },
    "memory:distill:progress": {
      request: MEMORY_DISTILL_PROGRESS_SCHEMA,
      response: MEMORY_DISTILL_PROGRESS_SCHEMA,
    },
    "memory:trace:get": {
      request: s.object({
        projectId: s.string(),
        generationId: s.string(),
      }),
      response: s.object({
        trace: MEMORY_GENERATION_TRACE_SCHEMA,
      }),
    },
    "memory:trace:feedback": {
      request: s.object({
        projectId: s.string(),
        generationId: s.string(),
        verdict: MEMORY_TRACE_FEEDBACK_VERDICT_SCHEMA,
        reason: s.optional(s.string()),
      }),
      response: s.object({
        accepted: s.literal(true),
        feedbackId: s.string(),
      }),
    },
    "search:fts:query": {
      request: s.object({
        projectId: s.string(),
        query: s.string(),
        limit: s.optional(s.number()),
        offset: s.optional(s.number()),
      }),
      response: s.object({
        results: s.array(SEARCH_FTS_ITEM_SCHEMA),
        total: s.number(),
        hasMore: s.boolean(),
        indexState: s.union(s.literal("ready"), s.literal("rebuilding")),
      }),
    },
    "search:fts:reindex": {
      request: s.object({
        projectId: s.string(),
      }),
      response: s.object({
        indexState: s.literal("ready"),
        reindexed: s.number(),
      }),
    },
    "search:semantic:query": {
      request: s.object({
        projectId: s.string(),
        queryText: s.string(),
        limit: s.optional(s.number()),
      }),
      response: s.object({ items: s.array(SEARCH_SEMANTIC_ITEM_SCHEMA) }),
    },
    "embedding:text:encode": {
      request: s.object({
        texts: s.array(s.string()),
        model: s.optional(s.string()),
      }),
      response: s.object({
        vectors: s.array(s.array(s.number())),
        dimension: s.number(),
      }),
    },
    "embedding:index:build": {
      request: s.object({
        documentId: s.string(),
        contentHash: s.string(),
      }),
      response: s.object({ accepted: s.literal(true) }),
    },
    "rag:context:retrieve": {
      request: s.object({
        projectId: s.string(),
        queryText: s.string(),
        limit: s.optional(s.number()),
        budgetTokens: s.optional(s.number()),
      }),
      response: s.object({
        items: s.array(RAG_RETRIEVE_ITEM_SCHEMA),
        diagnostics: RAG_RETRIEVE_DIAGNOSTICS_SCHEMA,
      }),
    },
    "knowledge:entity:create": {
      request: s.object({
        projectId: s.string(),
        type: KG_ENTITY_TYPE_SCHEMA,
        name: s.string(),
        description: s.optional(s.string()),
        attributes: s.optional(s.record(s.string())),
      }),
      response: KG_ENTITY_SCHEMA,
    },
    "knowledge:entity:read": {
      request: s.object({
        projectId: s.string(),
        id: s.string(),
      }),
      response: KG_ENTITY_SCHEMA,
    },
    "knowledge:entity:list": {
      request: s.object({ projectId: s.string() }),
      response: s.object({ items: s.array(KG_ENTITY_SCHEMA) }),
    },
    "knowledge:entity:update": {
      request: s.object({
        projectId: s.string(),
        id: s.string(),
        expectedVersion: s.number(),
        patch: s.object({
          type: s.optional(KG_ENTITY_TYPE_SCHEMA),
          name: s.optional(s.string()),
          description: s.optional(s.string()),
          attributes: s.optional(s.record(s.string())),
        }),
      }),
      response: KG_ENTITY_SCHEMA,
    },
    "knowledge:entity:delete": {
      request: s.object({
        projectId: s.string(),
        id: s.string(),
      }),
      response: s.object({
        deleted: s.literal(true),
        deletedRelationCount: s.number(),
      }),
    },
    "knowledge:relation:create": {
      request: s.object({
        projectId: s.string(),
        sourceEntityId: s.string(),
        targetEntityId: s.string(),
        relationType: s.string(),
        description: s.optional(s.string()),
      }),
      response: KG_RELATION_SCHEMA,
    },
    "knowledge:relation:list": {
      request: s.object({ projectId: s.string() }),
      response: s.object({ items: s.array(KG_RELATION_SCHEMA) }),
    },
    "knowledge:relation:update": {
      request: s.object({
        projectId: s.string(),
        id: s.string(),
        patch: s.object({
          sourceEntityId: s.optional(s.string()),
          targetEntityId: s.optional(s.string()),
          relationType: s.optional(s.string()),
          description: s.optional(s.string()),
        }),
      }),
      response: KG_RELATION_SCHEMA,
    },
    "knowledge:relation:delete": {
      request: s.object({
        projectId: s.string(),
        id: s.string(),
      }),
      response: s.object({ deleted: s.literal(true) }),
    },
    "knowledge:query:subgraph": {
      request: s.object({
        projectId: s.string(),
        centerEntityId: s.string(),
        k: s.number(),
      }),
      response: s.object({
        entities: s.array(KG_ENTITY_SCHEMA),
        relations: s.array(KG_RELATION_SCHEMA),
        nodeCount: s.number(),
        edgeCount: s.number(),
        queryCostMs: s.number(),
      }),
    },
    "knowledge:query:path": {
      request: s.object({
        projectId: s.string(),
        sourceEntityId: s.string(),
        targetEntityId: s.string(),
        timeoutMs: s.optional(s.number()),
      }),
      response: s.object({
        pathEntityIds: s.array(s.string()),
        queryCostMs: s.number(),
        expansions: s.number(),
        degraded: s.boolean(),
      }),
    },
    "knowledge:query:validate": {
      request: s.object({
        projectId: s.string(),
      }),
      response: s.object({
        cycles: s.array(s.array(s.string())),
        queryCostMs: s.number(),
      }),
    },
    "knowledge:recognition:enqueue": {
      request: s.object({
        projectId: s.string(),
        documentId: s.string(),
        sessionId: s.string(),
        contentText: s.string(),
        traceId: s.string(),
      }),
      response: KG_RECOGNITION_ENQUEUE_SCHEMA,
    },
    "knowledge:recognition:cancel": {
      request: s.object({
        projectId: s.string(),
        sessionId: s.string(),
        taskId: s.string(),
      }),
      response: s.object({
        canceled: s.literal(true),
      }),
    },
    "knowledge:recognition:stats": {
      request: s.object({
        projectId: s.string(),
        sessionId: s.string(),
      }),
      response: KG_RECOGNITION_STATS_SCHEMA,
    },
    "knowledge:suggestion:accept": {
      request: s.object({
        projectId: s.string(),
        sessionId: s.string(),
        suggestionId: s.string(),
      }),
      response: KG_ENTITY_SCHEMA,
    },
    "knowledge:suggestion:dismiss": {
      request: s.object({
        projectId: s.string(),
        sessionId: s.string(),
        suggestionId: s.string(),
      }),
      response: s.object({
        dismissed: s.literal(true),
      }),
    },
    "knowledge:query:relevant": {
      request: s.object({
        projectId: s.string(),
        excerpt: s.string(),
        maxEntities: s.optional(s.number()),
        entityIds: s.optional(s.array(s.string())),
      }),
      response: s.object({
        items: s.array(KG_ENTITY_SCHEMA),
        queryCostMs: s.number(),
      }),
    },
    "knowledge:query:byids": {
      request: s.object({
        projectId: s.string(),
        entityIds: s.array(s.string()),
      }),
      response: s.object({
        items: s.array(KG_ENTITY_SCHEMA),
      }),
    },
    "knowledge:rules:inject": {
      request: s.object({
        projectId: s.string(),
        documentId: s.string(),
        excerpt: s.string(),
        traceId: s.string(),
        maxEntities: s.optional(s.number()),
        entityIds: s.optional(s.array(s.string())),
      }),
      response: KG_RULES_INJECTION_SCHEMA,
    },
    "skill:registry:list": {
      request: s.object({ includeDisabled: s.optional(s.boolean()) }),
      response: s.object({ items: s.array(SKILL_LIST_ITEM_SCHEMA) }),
    },
    "skill:registry:read": {
      request: s.object({ id: s.string() }),
      response: s.object({ id: s.string(), content: s.string() }),
    },
    "skill:registry:write": {
      request: s.object({ id: s.string(), content: s.string() }),
      response: s.object({
        id: s.string(),
        scope: SKILL_SCOPE_SCHEMA,
        written: s.literal(true),
      }),
    },
    "skill:registry:toggle": {
      request: s.object({ id: s.string(), enabled: s.boolean() }),
      response: s.object({ id: s.string(), enabled: s.boolean() }),
    },
    "db:debug:tablenames": {
      request: s.object({}),
      response: s.object({ tableNames: s.array(s.string()) }),
    },
    "project:project:create": {
      request: s.object({
        name: s.optional(s.string()),
        type: s.optional(PROJECT_TYPE_SCHEMA),
        description: s.optional(s.string()),
      }),
      response: s.object({ projectId: s.string(), rootPath: s.string() }),
    },
    "project:project:createaiassist": {
      request: s.object({ prompt: s.string() }),
      response: s.object({
        name: s.string(),
        type: PROJECT_TYPE_SCHEMA,
        description: s.string(),
        chapterOutlines: s.array(s.string()),
        characters: s.array(s.string()),
      }),
    },
    "project:project:list": {
      request: s.object({ includeArchived: s.optional(s.boolean()) }),
      response: s.object({
        items: s.array(
          s.object({
            projectId: s.string(),
            name: s.string(),
            rootPath: s.string(),
            type: s.optional(PROJECT_TYPE_SCHEMA),
            stage: s.optional(PROJECT_STAGE_SCHEMA),
            updatedAt: s.number(),
            archivedAt: s.optional(s.number()),
          }),
        ),
      }),
    },
    "project:project:update": {
      request: s.object({
        projectId: s.string(),
        patch: s.object({
          type: s.optional(s.string()),
          description: s.optional(s.string()),
          stage: s.optional(s.string()),
          targetWordCount: s.optional(s.number()),
          targetChapterCount: s.optional(s.number()),
          narrativePerson: s.optional(s.string()),
          languageStyle: s.optional(s.string()),
          targetAudience: s.optional(s.string()),
          defaultSkillSetId: s.optional(s.string()),
          knowledgeGraphId: s.optional(s.string()),
        }),
      }),
      response: s.object({ updated: s.literal(true) }),
    },
    "project:project:stats": {
      request: s.object({}),
      response: s.object({
        total: s.number(),
        active: s.number(),
        archived: s.number(),
      }),
    },
    "project:project:rename": {
      request: s.object({ projectId: s.string(), name: s.string() }),
      response: s.object({
        projectId: s.string(),
        name: s.string(),
        updatedAt: s.number(),
      }),
    },
    "project:project:duplicate": {
      request: s.object({ projectId: s.string() }),
      response: s.object({
        projectId: s.string(),
        rootPath: s.string(),
        name: s.string(),
      }),
    },
    "project:project:archive": {
      request: s.object({ projectId: s.string(), archived: s.boolean() }),
      response: s.object({
        projectId: s.string(),
        archived: s.boolean(),
        archivedAt: s.optional(s.number()),
      }),
    },
    "project:project:getcurrent": {
      request: s.object({}),
      response: s.object({ projectId: s.string(), rootPath: s.string() }),
    },
    "project:project:setcurrent": {
      request: s.object({ projectId: s.string() }),
      response: s.object({ projectId: s.string(), rootPath: s.string() }),
    },
    "project:project:switch": {
      request: s.object({
        projectId: s.string(),
        operatorId: s.string(),
        fromProjectId: s.string(),
        traceId: s.string(),
      }),
      response: s.object({
        currentProjectId: s.string(),
        switchedAt: s.string(),
      }),
    },
    "project:project:delete": {
      request: s.object({ projectId: s.string() }),
      response: s.object({ deleted: s.literal(true) }),
    },
    "project:lifecycle:archive": {
      request: s.object({
        projectId: s.string(),
        traceId: s.optional(s.string()),
      }),
      response: s.object({
        projectId: s.string(),
        state: PROJECT_LIFECYCLE_STATE_SCHEMA,
        archivedAt: s.optional(s.number()),
      }),
    },
    "project:lifecycle:restore": {
      request: s.object({
        projectId: s.string(),
        traceId: s.optional(s.string()),
      }),
      response: s.object({
        projectId: s.string(),
        state: PROJECT_LIFECYCLE_STATE_SCHEMA,
      }),
    },
    "project:lifecycle:purge": {
      request: s.object({
        projectId: s.string(),
        traceId: s.optional(s.string()),
      }),
      response: s.object({
        projectId: s.string(),
        state: PROJECT_LIFECYCLE_STATE_SCHEMA,
      }),
    },
    "project:lifecycle:get": {
      request: s.object({
        projectId: s.string(),
        traceId: s.optional(s.string()),
      }),
      response: s.object({
        projectId: s.string(),
        state: PROJECT_LIFECYCLE_STATE_SCHEMA,
      }),
    },
    "context:creonow:ensure": {
      request: s.object({ projectId: s.string() }),
      response: s.object({ rootPath: s.string(), ensured: s.literal(true) }),
    },
    "context:creonow:status": {
      request: s.object({ projectId: s.string() }),
      response: s.object({
        exists: s.boolean(),
        watching: s.boolean(),
        rootPath: s.optional(s.string()),
      }),
    },
    "context:watch:start": {
      request: s.object({ projectId: s.string() }),
      response: s.object({ watching: s.literal(true) }),
    },
    "context:watch:stop": {
      request: s.object({ projectId: s.string() }),
      response: s.object({ watching: s.literal(false) }),
    },
    "context:prompt:assemble": {
      request: CONTEXT_ASSEMBLE_REQUEST_SCHEMA,
      response: CONTEXT_ASSEMBLE_RESPONSE_SCHEMA,
    },
    "context:prompt:inspect": {
      request: CONTEXT_INSPECT_REQUEST_SCHEMA,
      response: CONTEXT_INSPECT_RESPONSE_SCHEMA,
    },
    "context:rules:list": {
      request: s.object({ projectId: s.string() }),
      response: s.object({
        items: s.array(CREONOW_LIST_ITEM_SCHEMA),
      }),
    },
    "context:rules:read": {
      request: s.object({ projectId: s.string(), path: s.string() }),
      response: s.object({
        path: s.string(),
        content: s.string(),
        sizeBytes: s.number(),
        updatedAtMs: s.number(),
        redactionEvidence: s.array(REDACTION_EVIDENCE_SCHEMA),
      }),
    },
    "context:settings:list": {
      request: s.object({ projectId: s.string() }),
      response: s.object({
        items: s.array(CREONOW_LIST_ITEM_SCHEMA),
      }),
    },
    "context:settings:read": {
      request: s.object({ projectId: s.string(), path: s.string() }),
      response: s.object({
        path: s.string(),
        content: s.string(),
        sizeBytes: s.number(),
        updatedAtMs: s.number(),
        redactionEvidence: s.array(REDACTION_EVIDENCE_SCHEMA),
      }),
    },
    "constraints:policy:get": {
      request: s.object({ projectId: s.string() }),
      response: s.object({
        constraints: s.object({
          version: s.literal(1),
          items: s.array(s.string()),
        }),
      }),
    },
    "constraints:policy:set": {
      request: s.object({
        projectId: s.string(),
        constraints: s.object({
          version: s.literal(1),
          items: s.array(s.string()),
        }),
      }),
      response: s.object({
        constraints: s.object({
          version: s.literal(1),
          items: s.array(s.string()),
        }),
      }),
    },
    "judge:model:getstate": {
      request: s.object({}),
      response: s.object({ state: JUDGE_MODEL_STATE_SCHEMA }),
    },
    "judge:model:ensure": {
      request: s.object({ timeoutMs: s.optional(s.number()) }),
      response: s.object({ state: JUDGE_MODEL_STATE_SCHEMA }),
    },
    "file:document:create": {
      request: s.object({
        projectId: s.string(),
        title: s.optional(s.string()),
        type: s.optional(DOCUMENT_TYPE_SCHEMA),
      }),
      response: s.object({ documentId: s.string() }),
    },
    "file:document:list": {
      request: s.object({ projectId: s.string() }),
      response: s.object({
        items: s.array(DOCUMENT_LIST_ITEM_SCHEMA),
      }),
    },
    "file:document:read": {
      request: s.object({ projectId: s.string(), documentId: s.string() }),
      response: s.object({
        documentId: s.string(),
        projectId: s.string(),
        type: DOCUMENT_TYPE_SCHEMA,
        title: s.string(),
        status: DOCUMENT_STATUS_SCHEMA,
        sortOrder: s.number(),
        parentId: s.optional(s.string()),
        contentJson: s.string(),
        contentText: s.string(),
        contentMd: s.string(),
        contentHash: s.string(),
        createdAt: s.number(),
        updatedAt: s.number(),
      }),
    },
    "file:document:update": {
      request: s.object({
        projectId: s.string(),
        documentId: s.string(),
        title: s.optional(s.string()),
        type: s.optional(DOCUMENT_TYPE_SCHEMA),
        status: s.optional(DOCUMENT_STATUS_SCHEMA),
        sortOrder: s.optional(s.number()),
        parentId: s.optional(s.string()),
      }),
      response: s.object({ updated: s.literal(true) }),
    },
    "file:document:save": {
      request: s.object({
        projectId: s.string(),
        documentId: s.string(),
        contentJson: s.string(),
        actor: s.union(s.literal("user"), s.literal("auto"), s.literal("ai")),
        reason: s.string(),
      }),
      response: s.object({ updatedAt: s.number(), contentHash: s.string() }),
    },
    "file:document:getcurrent": {
      request: s.object({ projectId: s.string() }),
      response: s.object({ documentId: s.string() }),
    },
    "file:document:setcurrent": {
      request: s.object({ projectId: s.string(), documentId: s.string() }),
      response: s.object({ documentId: s.string() }),
    },
    "file:document:reorder": {
      request: s.object({
        projectId: s.string(),
        orderedDocumentIds: s.array(s.string()),
      }),
      response: s.object({ updated: s.literal(true) }),
    },
    "file:document:updatestatus": {
      request: s.object({
        projectId: s.string(),
        documentId: s.string(),
        status: DOCUMENT_STATUS_SCHEMA,
      }),
      response: s.object({
        updated: s.literal(true),
        status: DOCUMENT_STATUS_SCHEMA,
      }),
    },
    "file:document:delete": {
      request: s.object({ projectId: s.string(), documentId: s.string() }),
      response: s.object({ deleted: s.literal(true) }),
    },
    "version:snapshot:list": {
      request: s.object({ documentId: s.string() }),
      response: s.object({
        items: s.array(
          s.object({
            versionId: s.string(),
            actor: s.union(
              s.literal("user"),
              s.literal("auto"),
              s.literal("ai"),
            ),
            reason: s.string(),
            contentHash: s.string(),
            createdAt: s.number(),
          }),
        ),
      }),
    },
    "version:snapshot:read": {
      request: s.object({ documentId: s.string(), versionId: s.string() }),
      response: s.object({
        documentId: s.string(),
        projectId: s.string(),
        versionId: s.string(),
        actor: s.union(s.literal("user"), s.literal("auto"), s.literal("ai")),
        reason: s.string(),
        contentJson: s.string(),
        contentText: s.string(),
        contentMd: s.string(),
        contentHash: s.string(),
        createdAt: s.number(),
      }),
    },
    "version:snapshot:restore": {
      request: s.object({ documentId: s.string(), versionId: s.string() }),
      response: s.object({ restored: s.literal(true) }),
    },
    "version:aiapply:logconflict": {
      request: s.object({ documentId: s.string(), runId: s.string() }),
      response: s.object({ logged: s.literal(true) }),
    },
  },
} as const;
