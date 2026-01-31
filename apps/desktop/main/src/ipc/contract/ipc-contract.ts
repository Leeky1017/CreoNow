import { s } from "./schema";

export const IPC_ERROR_CODES = [
  "INVALID_ARGUMENT",
  "NOT_FOUND",
  "ALREADY_EXISTS",
  "CONFLICT",
  "PERMISSION_DENIED",
  "UNSUPPORTED",
  "IO_ERROR",
  "DB_ERROR",
  "MODEL_NOT_READY",
  "ENCODING_FAILED",
  "RATE_LIMITED",
  "TIMEOUT",
  "CANCELED",
  "UPSTREAM_ERROR",
  "INTERNAL",
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

const SEARCH_FTS_ITEM_SCHEMA = s.object({
  documentId: s.string(),
  title: s.string(),
  snippet: s.string(),
  score: s.number(),
});

const SEARCH_SEMANTIC_ITEM_SCHEMA = s.object({
  documentId: s.string(),
  chunkId: s.optional(s.string()),
  snippet: s.string(),
  score: s.number(),
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

const MEMORY_SCOPE_SCHEMA = s.union(s.literal("global"), s.literal("project"));

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

const KG_ENTITY_SCHEMA = s.object({
  entityId: s.string(),
  projectId: s.string(),
  name: s.string(),
  entityType: s.optional(s.string()),
  description: s.optional(s.string()),
  metadataJson: s.string(),
  createdAt: s.number(),
  updatedAt: s.number(),
});

const KG_RELATION_SCHEMA = s.object({
  relationId: s.string(),
  projectId: s.string(),
  fromEntityId: s.string(),
  toEntityId: s.string(),
  relationType: s.string(),
  metadataJson: s.string(),
  evidenceJson: s.string(),
  createdAt: s.number(),
  updatedAt: s.number(),
});

export const ipcContract = {
  version: 1,
  errorCodes: IPC_ERROR_CODES,
  channels: {
    "app:ping": {
      request: s.object({}),
      response: s.object({}),
    },
    "ai:skill:run": {
      request: s.object({
        skillId: s.string(),
        input: s.string(),
        context: s.optional(
          s.object({
            projectId: s.optional(s.string()),
            documentId: s.optional(s.string()),
          }),
        ),
        stream: s.boolean(),
      }),
      response: s.object({
        runId: s.string(),
        outputText: s.optional(s.string()),
      }),
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
    "memory:create": {
      request: s.object({
        type: MEMORY_TYPE_SCHEMA,
        scope: MEMORY_SCOPE_SCHEMA,
        projectId: s.optional(s.string()),
        content: s.string(),
      }),
      response: s.object({
        memoryId: s.string(),
        type: MEMORY_TYPE_SCHEMA,
        scope: MEMORY_SCOPE_SCHEMA,
        projectId: s.optional(s.string()),
        origin: MEMORY_ORIGIN_SCHEMA,
        sourceRef: s.optional(s.string()),
        content: s.string(),
        createdAt: s.number(),
        updatedAt: s.number(),
        deletedAt: s.optional(s.number()),
      }),
    },
    "memory:list": {
      request: s.object({
        projectId: s.optional(s.string()),
        includeDeleted: s.optional(s.boolean()),
      }),
      response: s.object({
        items: s.array(
          s.object({
            memoryId: s.string(),
            type: MEMORY_TYPE_SCHEMA,
            scope: MEMORY_SCOPE_SCHEMA,
            projectId: s.optional(s.string()),
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
    "memory:update": {
      request: s.object({
        memoryId: s.string(),
        patch: s.object({
          type: s.optional(MEMORY_TYPE_SCHEMA),
          scope: s.optional(MEMORY_SCOPE_SCHEMA),
          projectId: s.optional(s.string()),
          content: s.optional(s.string()),
        }),
      }),
      response: s.object({
        memoryId: s.string(),
        type: MEMORY_TYPE_SCHEMA,
        scope: MEMORY_SCOPE_SCHEMA,
        projectId: s.optional(s.string()),
        origin: MEMORY_ORIGIN_SCHEMA,
        sourceRef: s.optional(s.string()),
        content: s.string(),
        createdAt: s.number(),
        updatedAt: s.number(),
        deletedAt: s.optional(s.number()),
      }),
    },
    "memory:delete": {
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
    "search:fulltext": {
      request: s.object({
        projectId: s.string(),
        query: s.string(),
        limit: s.optional(s.number()),
      }),
      response: s.object({ items: s.array(SEARCH_FTS_ITEM_SCHEMA) }),
    },
    "search:semantic": {
      request: s.object({
        projectId: s.string(),
        queryText: s.string(),
        limit: s.optional(s.number()),
      }),
      response: s.object({ items: s.array(SEARCH_SEMANTIC_ITEM_SCHEMA) }),
    },
    "embedding:encode": {
      request: s.object({
        texts: s.array(s.string()),
        model: s.optional(s.string()),
      }),
      response: s.object({
        vectors: s.array(s.array(s.number())),
        dimension: s.number(),
      }),
    },
    "embedding:index": {
      request: s.object({
        documentId: s.string(),
        contentHash: s.string(),
      }),
      response: s.object({ accepted: s.literal(true) }),
    },
    "kg:graph:get": {
      request: s.object({
        projectId: s.string(),
        purpose: s.optional(s.union(s.literal("ui"), s.literal("context"))),
      }),
      response: s.object({
        entities: s.array(KG_ENTITY_SCHEMA),
        relations: s.array(KG_RELATION_SCHEMA),
      }),
    },
    "kg:entity:create": {
      request: s.object({
        projectId: s.string(),
        name: s.string(),
        entityType: s.optional(s.string()),
        description: s.optional(s.string()),
        metadataJson: s.optional(s.string()),
      }),
      response: KG_ENTITY_SCHEMA,
    },
    "kg:entity:list": {
      request: s.object({ projectId: s.string() }),
      response: s.object({ items: s.array(KG_ENTITY_SCHEMA) }),
    },
    "kg:entity:update": {
      request: s.object({
        entityId: s.string(),
        patch: s.object({
          name: s.optional(s.string()),
          entityType: s.optional(s.string()),
          description: s.optional(s.string()),
          metadataJson: s.optional(s.string()),
        }),
      }),
      response: KG_ENTITY_SCHEMA,
    },
    "kg:entity:delete": {
      request: s.object({ entityId: s.string() }),
      response: s.object({ deleted: s.literal(true) }),
    },
    "kg:relation:create": {
      request: s.object({
        projectId: s.string(),
        fromEntityId: s.string(),
        toEntityId: s.string(),
        relationType: s.string(),
        metadataJson: s.optional(s.string()),
        evidenceJson: s.optional(s.string()),
      }),
      response: KG_RELATION_SCHEMA,
    },
    "kg:relation:list": {
      request: s.object({ projectId: s.string() }),
      response: s.object({ items: s.array(KG_RELATION_SCHEMA) }),
    },
    "kg:relation:update": {
      request: s.object({
        relationId: s.string(),
        patch: s.object({
          fromEntityId: s.optional(s.string()),
          toEntityId: s.optional(s.string()),
          relationType: s.optional(s.string()),
          metadataJson: s.optional(s.string()),
          evidenceJson: s.optional(s.string()),
        }),
      }),
      response: KG_RELATION_SCHEMA,
    },
    "kg:relation:delete": {
      request: s.object({ relationId: s.string() }),
      response: s.object({ deleted: s.literal(true) }),
    },
    "skill:list": {
      request: s.object({ includeDisabled: s.optional(s.boolean()) }),
      response: s.object({ items: s.array(SKILL_LIST_ITEM_SCHEMA) }),
    },
    "skill:read": {
      request: s.object({ id: s.string() }),
      response: s.object({ id: s.string(), content: s.string() }),
    },
    "skill:write": {
      request: s.object({ id: s.string(), content: s.string() }),
      response: s.object({
        id: s.string(),
        scope: SKILL_SCOPE_SCHEMA,
        written: s.literal(true),
      }),
    },
    "skill:toggle": {
      request: s.object({ id: s.string(), enabled: s.boolean() }),
      response: s.object({ id: s.string(), enabled: s.boolean() }),
    },
    "db:debug:tableNames": {
      request: s.object({}),
      response: s.object({ tableNames: s.array(s.string()) }),
    },
    "project:create": {
      request: s.object({ name: s.optional(s.string()) }),
      response: s.object({ projectId: s.string(), rootPath: s.string() }),
    },
    "project:list": {
      request: s.object({ includeDeleted: s.optional(s.boolean()) }),
      response: s.object({
        items: s.array(
          s.object({
            projectId: s.string(),
            name: s.string(),
            rootPath: s.string(),
            updatedAt: s.number(),
          }),
        ),
      }),
    },
    "project:getCurrent": {
      request: s.object({}),
      response: s.object({ projectId: s.string(), rootPath: s.string() }),
    },
    "project:setCurrent": {
      request: s.object({ projectId: s.string() }),
      response: s.object({ projectId: s.string(), rootPath: s.string() }),
    },
    "project:delete": {
      request: s.object({ projectId: s.string() }),
      response: s.object({ deleted: s.literal(true) }),
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
    "context:creonow:watch:start": {
      request: s.object({ projectId: s.string() }),
      response: s.object({ watching: s.literal(true) }),
    },
    "context:creonow:watch:stop": {
      request: s.object({ projectId: s.string() }),
      response: s.object({ watching: s.literal(false) }),
    },
    "context:creonow:rules:list": {
      request: s.object({ projectId: s.string() }),
      response: s.object({
        items: s.array(CREONOW_LIST_ITEM_SCHEMA),
      }),
    },
    "context:creonow:rules:read": {
      request: s.object({ projectId: s.string(), path: s.string() }),
      response: s.object({
        path: s.string(),
        content: s.string(),
        sizeBytes: s.number(),
        updatedAtMs: s.number(),
        redactionEvidence: s.array(REDACTION_EVIDENCE_SCHEMA),
      }),
    },
    "context:creonow:settings:list": {
      request: s.object({ projectId: s.string() }),
      response: s.object({
        items: s.array(CREONOW_LIST_ITEM_SCHEMA),
      }),
    },
    "context:creonow:settings:read": {
      request: s.object({ projectId: s.string(), path: s.string() }),
      response: s.object({
        path: s.string(),
        content: s.string(),
        sizeBytes: s.number(),
        updatedAtMs: s.number(),
        redactionEvidence: s.array(REDACTION_EVIDENCE_SCHEMA),
      }),
    },
    "constraints:get": {
      request: s.object({ projectId: s.string() }),
      response: s.object({
        constraints: s.object({
          version: s.literal(1),
          items: s.array(s.string()),
        }),
      }),
    },
    "constraints:set": {
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
    "judge:model:getState": {
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
      }),
      response: s.object({ documentId: s.string() }),
    },
    "file:document:list": {
      request: s.object({ projectId: s.string() }),
      response: s.object({
        items: s.array(
          s.object({
            documentId: s.string(),
            title: s.string(),
            updatedAt: s.number(),
          }),
        ),
      }),
    },
    "file:document:read": {
      request: s.object({ projectId: s.string(), documentId: s.string() }),
      response: s.object({
        documentId: s.string(),
        projectId: s.string(),
        title: s.string(),
        contentJson: s.string(),
        contentText: s.string(),
        contentMd: s.string(),
        contentHash: s.string(),
        updatedAt: s.number(),
      }),
    },
    "file:document:rename": {
      request: s.object({
        projectId: s.string(),
        documentId: s.string(),
        title: s.string(),
      }),
      response: s.object({ updated: s.literal(true) }),
    },
    "file:document:write": {
      request: s.object({
        projectId: s.string(),
        documentId: s.string(),
        contentJson: s.string(),
        actor: s.union(s.literal("user"), s.literal("auto"), s.literal("ai")),
        reason: s.string(),
      }),
      response: s.object({ updatedAt: s.number(), contentHash: s.string() }),
    },
    "file:document:getCurrent": {
      request: s.object({ projectId: s.string() }),
      response: s.object({ documentId: s.string() }),
    },
    "file:document:setCurrent": {
      request: s.object({ projectId: s.string(), documentId: s.string() }),
      response: s.object({ documentId: s.string() }),
    },
    "file:document:delete": {
      request: s.object({ projectId: s.string(), documentId: s.string() }),
      response: s.object({ deleted: s.literal(true) }),
    },
    "version:list": {
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
    "version:restore": {
      request: s.object({ documentId: s.string(), versionId: s.string() }),
      response: s.object({ restored: s.literal(true) }),
    },
    "version:aiApply:logConflict": {
      request: s.object({ documentId: s.string(), runId: s.string() }),
      response: s.object({ logged: s.literal(true) }),
    },
  },
} as const;
