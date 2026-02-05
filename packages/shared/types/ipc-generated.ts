/* eslint-disable */
/**
 * GENERATED FILE - DO NOT EDIT.
 * Source: apps/desktop/main/src/ipc/contract/ipc-contract.ts
 * Run: pnpm contract:generate
 */

export type IpcErrorCode =
  | "ALREADY_EXISTS"
  | "CANCELED"
  | "CONFLICT"
  | "DB_ERROR"
  | "ENCODING_FAILED"
  | "INTERNAL"
  | "INVALID_ARGUMENT"
  | "IO_ERROR"
  | "MODEL_NOT_READY"
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UNSUPPORTED"
  | "UPSTREAM_ERROR";

export type IpcMeta = {
  requestId: string;
  ts: number;
};

export type IpcError = {
  code: IpcErrorCode;
  message: string;
  details?: unknown;
  retryable?: boolean;
};

export type IpcOk<TData> = {
  ok: true;
  data: TData;
  meta?: IpcMeta;
};

export type IpcErr = {
  ok: false;
  error: IpcError;
  meta?: IpcMeta;
};

export type IpcResponse<TData> = IpcOk<TData> | IpcErr;

export const IPC_CHANNELS = [
  "ai:proxy:settings:get",
  "ai:proxy:settings:update",
  "ai:proxy:test",
  "ai:skill:cancel",
  "ai:skill:feedback",
  "ai:skill:run",
  "app:ping",
  "constraints:get",
  "constraints:set",
  "context:creonow:ensure",
  "context:creonow:rules:list",
  "context:creonow:rules:read",
  "context:creonow:settings:list",
  "context:creonow:settings:read",
  "context:creonow:status",
  "context:creonow:watch:start",
  "context:creonow:watch:stop",
  "db:debug:tableNames",
  "embedding:encode",
  "embedding:index",
  "export:docx",
  "export:markdown",
  "export:pdf",
  "export:txt",
  "file:document:create",
  "file:document:delete",
  "file:document:getCurrent",
  "file:document:list",
  "file:document:read",
  "file:document:rename",
  "file:document:setCurrent",
  "file:document:write",
  "judge:model:ensure",
  "judge:model:getState",
  "kg:entity:create",
  "kg:entity:delete",
  "kg:entity:list",
  "kg:entity:update",
  "kg:graph:get",
  "kg:relation:create",
  "kg:relation:delete",
  "kg:relation:list",
  "kg:relation:update",
  "memory:create",
  "memory:delete",
  "memory:injection:preview",
  "memory:list",
  "memory:settings:get",
  "memory:settings:update",
  "memory:update",
  "project:create",
  "project:delete",
  "project:getCurrent",
  "project:list",
  "project:setCurrent",
  "rag:retrieve",
  "search:fulltext",
  "search:semantic",
  "skill:list",
  "skill:read",
  "skill:toggle",
  "skill:write",
  "stats:getRange",
  "stats:getToday",
  "version:aiApply:logConflict",
  "version:list",
  "version:read",
  "version:restore",
] as const;

export type IpcChannel = (typeof IPC_CHANNELS)[number];

export type IpcChannelSpec = {
  "ai:proxy:settings:get": {
    request: Record<string, never>;
    response: {
      apiKeyConfigured: boolean;
      baseUrl: string;
      enabled: boolean;
    };
  };
  "ai:proxy:settings:update": {
    request: {
      patch: {
        apiKey?: string;
        baseUrl?: string;
        enabled?: boolean;
      };
    };
    response: {
      apiKeyConfigured: boolean;
      baseUrl: string;
      enabled: boolean;
    };
  };
  "ai:proxy:test": {
    request: Record<string, never>;
    response: {
      error?: {
        code:
          | "INVALID_ARGUMENT"
          | "NOT_FOUND"
          | "ALREADY_EXISTS"
          | "CONFLICT"
          | "PERMISSION_DENIED"
          | "UNSUPPORTED"
          | "IO_ERROR"
          | "DB_ERROR"
          | "MODEL_NOT_READY"
          | "ENCODING_FAILED"
          | "RATE_LIMITED"
          | "TIMEOUT"
          | "CANCELED"
          | "UPSTREAM_ERROR"
          | "INTERNAL";
        message: string;
      };
      latencyMs: number;
      ok: boolean;
    };
  };
  "ai:skill:cancel": {
    request: {
      runId: string;
    };
    response: {
      canceled: true;
    };
  };
  "ai:skill:feedback": {
    request: {
      action: "accept" | "reject" | "partial";
      evidenceRef: string;
      runId: string;
    };
    response: {
      learning?: {
        ignored: boolean;
        ignoredReason?: string;
        learned: boolean;
        learnedMemoryId?: string;
        signalCount?: number;
        threshold?: number;
      };
      recorded: true;
    };
  };
  "ai:skill:run": {
    request: {
      context?: {
        documentId?: string;
        projectId?: string;
      };
      input: string;
      promptDiagnostics?: {
        promptHash: string;
        stablePrefixHash: string;
      };
      skillId: string;
      stream: boolean;
    };
    response: {
      outputText?: string;
      promptDiagnostics?: {
        promptHash: string;
        stablePrefixHash: string;
      };
      runId: string;
    };
  };
  "app:ping": {
    request: Record<string, never>;
    response: Record<string, never>;
  };
  "constraints:get": {
    request: {
      projectId: string;
    };
    response: {
      constraints: {
        items: Array<string>;
        version: 1;
      };
    };
  };
  "constraints:set": {
    request: {
      constraints: {
        items: Array<string>;
        version: 1;
      };
      projectId: string;
    };
    response: {
      constraints: {
        items: Array<string>;
        version: 1;
      };
    };
  };
  "context:creonow:ensure": {
    request: {
      projectId: string;
    };
    response: {
      ensured: true;
      rootPath: string;
    };
  };
  "context:creonow:rules:list": {
    request: {
      projectId: string;
    };
    response: {
      items: Array<{
        path: string;
        sizeBytes: number;
        updatedAtMs: number;
      }>;
    };
  };
  "context:creonow:rules:read": {
    request: {
      path: string;
      projectId: string;
    };
    response: {
      content: string;
      path: string;
      redactionEvidence: Array<{
        matchCount: number;
        patternId: string;
        sourceRef: string;
      }>;
      sizeBytes: number;
      updatedAtMs: number;
    };
  };
  "context:creonow:settings:list": {
    request: {
      projectId: string;
    };
    response: {
      items: Array<{
        path: string;
        sizeBytes: number;
        updatedAtMs: number;
      }>;
    };
  };
  "context:creonow:settings:read": {
    request: {
      path: string;
      projectId: string;
    };
    response: {
      content: string;
      path: string;
      redactionEvidence: Array<{
        matchCount: number;
        patternId: string;
        sourceRef: string;
      }>;
      sizeBytes: number;
      updatedAtMs: number;
    };
  };
  "context:creonow:status": {
    request: {
      projectId: string;
    };
    response: {
      exists: boolean;
      rootPath?: string;
      watching: boolean;
    };
  };
  "context:creonow:watch:start": {
    request: {
      projectId: string;
    };
    response: {
      watching: true;
    };
  };
  "context:creonow:watch:stop": {
    request: {
      projectId: string;
    };
    response: {
      watching: false;
    };
  };
  "db:debug:tableNames": {
    request: Record<string, never>;
    response: {
      tableNames: Array<string>;
    };
  };
  "embedding:encode": {
    request: {
      model?: string;
      texts: Array<string>;
    };
    response: {
      dimension: number;
      vectors: Array<Array<number>>;
    };
  };
  "embedding:index": {
    request: {
      contentHash: string;
      documentId: string;
    };
    response: {
      accepted: true;
    };
  };
  "export:docx": {
    request: {
      documentId?: string;
      projectId: string;
    };
    response: {
      bytesWritten: number;
      relativePath: string;
    };
  };
  "export:markdown": {
    request: {
      documentId?: string;
      projectId: string;
    };
    response: {
      bytesWritten: number;
      relativePath: string;
    };
  };
  "export:pdf": {
    request: {
      documentId?: string;
      projectId: string;
    };
    response: {
      bytesWritten: number;
      relativePath: string;
    };
  };
  "export:txt": {
    request: {
      documentId?: string;
      projectId: string;
    };
    response: {
      bytesWritten: number;
      relativePath: string;
    };
  };
  "file:document:create": {
    request: {
      projectId: string;
      title?: string;
    };
    response: {
      documentId: string;
    };
  };
  "file:document:delete": {
    request: {
      documentId: string;
      projectId: string;
    };
    response: {
      deleted: true;
    };
  };
  "file:document:getCurrent": {
    request: {
      projectId: string;
    };
    response: {
      documentId: string;
    };
  };
  "file:document:list": {
    request: {
      projectId: string;
    };
    response: {
      items: Array<{
        documentId: string;
        title: string;
        updatedAt: number;
      }>;
    };
  };
  "file:document:read": {
    request: {
      documentId: string;
      projectId: string;
    };
    response: {
      contentHash: string;
      contentJson: string;
      contentMd: string;
      contentText: string;
      documentId: string;
      projectId: string;
      title: string;
      updatedAt: number;
    };
  };
  "file:document:rename": {
    request: {
      documentId: string;
      projectId: string;
      title: string;
    };
    response: {
      updated: true;
    };
  };
  "file:document:setCurrent": {
    request: {
      documentId: string;
      projectId: string;
    };
    response: {
      documentId: string;
    };
  };
  "file:document:write": {
    request: {
      actor: "user" | "auto" | "ai";
      contentJson: string;
      documentId: string;
      projectId: string;
      reason: string;
    };
    response: {
      contentHash: string;
      updatedAt: number;
    };
  };
  "judge:model:ensure": {
    request: {
      timeoutMs?: number;
    };
    response: {
      state:
        | {
            status: "not_ready";
          }
        | {
            status: "downloading";
          }
        | {
            status: "ready";
          }
        | {
            error: {
              code:
                | "INVALID_ARGUMENT"
                | "NOT_FOUND"
                | "ALREADY_EXISTS"
                | "CONFLICT"
                | "PERMISSION_DENIED"
                | "UNSUPPORTED"
                | "IO_ERROR"
                | "DB_ERROR"
                | "MODEL_NOT_READY"
                | "ENCODING_FAILED"
                | "RATE_LIMITED"
                | "TIMEOUT"
                | "CANCELED"
                | "UPSTREAM_ERROR"
                | "INTERNAL";
              message: string;
            };
            status: "error";
          };
    };
  };
  "judge:model:getState": {
    request: Record<string, never>;
    response: {
      state:
        | {
            status: "not_ready";
          }
        | {
            status: "downloading";
          }
        | {
            status: "ready";
          }
        | {
            error: {
              code:
                | "INVALID_ARGUMENT"
                | "NOT_FOUND"
                | "ALREADY_EXISTS"
                | "CONFLICT"
                | "PERMISSION_DENIED"
                | "UNSUPPORTED"
                | "IO_ERROR"
                | "DB_ERROR"
                | "MODEL_NOT_READY"
                | "ENCODING_FAILED"
                | "RATE_LIMITED"
                | "TIMEOUT"
                | "CANCELED"
                | "UPSTREAM_ERROR"
                | "INTERNAL";
              message: string;
            };
            status: "error";
          };
    };
  };
  "kg:entity:create": {
    request: {
      description?: string;
      entityType?: string;
      metadataJson?: string;
      name: string;
      projectId: string;
    };
    response: {
      createdAt: number;
      description?: string;
      entityId: string;
      entityType?: string;
      metadataJson: string;
      name: string;
      projectId: string;
      updatedAt: number;
    };
  };
  "kg:entity:delete": {
    request: {
      entityId: string;
    };
    response: {
      deleted: true;
    };
  };
  "kg:entity:list": {
    request: {
      projectId: string;
    };
    response: {
      items: Array<{
        createdAt: number;
        description?: string;
        entityId: string;
        entityType?: string;
        metadataJson: string;
        name: string;
        projectId: string;
        updatedAt: number;
      }>;
    };
  };
  "kg:entity:update": {
    request: {
      entityId: string;
      patch: {
        description?: string;
        entityType?: string;
        metadataJson?: string;
        name?: string;
      };
    };
    response: {
      createdAt: number;
      description?: string;
      entityId: string;
      entityType?: string;
      metadataJson: string;
      name: string;
      projectId: string;
      updatedAt: number;
    };
  };
  "kg:graph:get": {
    request: {
      projectId: string;
      purpose?: "ui" | "context";
    };
    response: {
      entities: Array<{
        createdAt: number;
        description?: string;
        entityId: string;
        entityType?: string;
        metadataJson: string;
        name: string;
        projectId: string;
        updatedAt: number;
      }>;
      relations: Array<{
        createdAt: number;
        evidenceJson: string;
        fromEntityId: string;
        metadataJson: string;
        projectId: string;
        relationId: string;
        relationType: string;
        toEntityId: string;
        updatedAt: number;
      }>;
    };
  };
  "kg:relation:create": {
    request: {
      evidenceJson?: string;
      fromEntityId: string;
      metadataJson?: string;
      projectId: string;
      relationType: string;
      toEntityId: string;
    };
    response: {
      createdAt: number;
      evidenceJson: string;
      fromEntityId: string;
      metadataJson: string;
      projectId: string;
      relationId: string;
      relationType: string;
      toEntityId: string;
      updatedAt: number;
    };
  };
  "kg:relation:delete": {
    request: {
      relationId: string;
    };
    response: {
      deleted: true;
    };
  };
  "kg:relation:list": {
    request: {
      projectId: string;
    };
    response: {
      items: Array<{
        createdAt: number;
        evidenceJson: string;
        fromEntityId: string;
        metadataJson: string;
        projectId: string;
        relationId: string;
        relationType: string;
        toEntityId: string;
        updatedAt: number;
      }>;
    };
  };
  "kg:relation:update": {
    request: {
      patch: {
        evidenceJson?: string;
        fromEntityId?: string;
        metadataJson?: string;
        relationType?: string;
        toEntityId?: string;
      };
      relationId: string;
    };
    response: {
      createdAt: number;
      evidenceJson: string;
      fromEntityId: string;
      metadataJson: string;
      projectId: string;
      relationId: string;
      relationType: string;
      toEntityId: string;
      updatedAt: number;
    };
  };
  "memory:create": {
    request: {
      content: string;
      documentId?: string;
      projectId?: string;
      scope: "global" | "project" | "document";
      type: "preference" | "fact" | "note";
    };
    response: {
      content: string;
      createdAt: number;
      deletedAt?: number;
      documentId?: string;
      memoryId: string;
      origin: "manual" | "learned";
      projectId?: string;
      scope: "global" | "project" | "document";
      sourceRef?: string;
      type: "preference" | "fact" | "note";
      updatedAt: number;
    };
  };
  "memory:delete": {
    request: {
      memoryId: string;
    };
    response: {
      deleted: true;
    };
  };
  "memory:injection:preview": {
    request: {
      documentId?: string;
      projectId?: string;
      queryText?: string;
    };
    response: {
      diagnostics?: {
        degradedFrom: "semantic";
        reason: string;
      };
      items: Array<{
        content: string;
        id: string;
        origin: "manual" | "learned";
        reason:
          | {
              kind: "deterministic";
            }
          | {
              kind: "semantic";
              score: number;
            };
        scope: "global" | "project" | "document";
        type: "preference" | "fact" | "note";
      }>;
      mode: "deterministic" | "semantic";
    };
  };
  "memory:list": {
    request: {
      documentId?: string;
      includeDeleted?: boolean;
      projectId?: string;
    };
    response: {
      items: Array<{
        content: string;
        createdAt: number;
        deletedAt?: number;
        documentId?: string;
        memoryId: string;
        origin: "manual" | "learned";
        projectId?: string;
        scope: "global" | "project" | "document";
        sourceRef?: string;
        type: "preference" | "fact" | "note";
        updatedAt: number;
      }>;
    };
  };
  "memory:settings:get": {
    request: Record<string, never>;
    response: {
      injectionEnabled: boolean;
      preferenceLearningEnabled: boolean;
      preferenceLearningThreshold: number;
      privacyModeEnabled: boolean;
    };
  };
  "memory:settings:update": {
    request: {
      patch: {
        injectionEnabled?: boolean;
        preferenceLearningEnabled?: boolean;
        preferenceLearningThreshold?: number;
        privacyModeEnabled?: boolean;
      };
    };
    response: {
      injectionEnabled: boolean;
      preferenceLearningEnabled: boolean;
      preferenceLearningThreshold: number;
      privacyModeEnabled: boolean;
    };
  };
  "memory:update": {
    request: {
      memoryId: string;
      patch: {
        content?: string;
        documentId?: string;
        projectId?: string;
        scope?: "global" | "project" | "document";
        type?: "preference" | "fact" | "note";
      };
    };
    response: {
      content: string;
      createdAt: number;
      deletedAt?: number;
      documentId?: string;
      memoryId: string;
      origin: "manual" | "learned";
      projectId?: string;
      scope: "global" | "project" | "document";
      sourceRef?: string;
      type: "preference" | "fact" | "note";
      updatedAt: number;
    };
  };
  "project:create": {
    request: {
      name?: string;
    };
    response: {
      projectId: string;
      rootPath: string;
    };
  };
  "project:delete": {
    request: {
      projectId: string;
    };
    response: {
      deleted: true;
    };
  };
  "project:getCurrent": {
    request: Record<string, never>;
    response: {
      projectId: string;
      rootPath: string;
    };
  };
  "project:list": {
    request: {
      includeDeleted?: boolean;
    };
    response: {
      items: Array<{
        name: string;
        projectId: string;
        rootPath: string;
        updatedAt: number;
      }>;
    };
  };
  "project:setCurrent": {
    request: {
      projectId: string;
    };
    response: {
      projectId: string;
      rootPath: string;
    };
  };
  "rag:retrieve": {
    request: {
      budgetTokens?: number;
      limit?: number;
      projectId: string;
      queryText: string;
    };
    response: {
      diagnostics: {
        budgetTokens: number;
        degradedFrom?: "semantic";
        droppedCount: number;
        mode: "fulltext" | "fulltext_reranked";
        planner: {
          perQueryHits: Array<number>;
          queries: Array<string>;
          selectedCount: number;
          selectedQuery: string;
        };
        reason?: string;
        rerank: {
          enabled: boolean;
          model?: string;
          reason?: string;
        };
        trimmedCount: number;
        usedTokens: number;
      };
      items: Array<{
        score: number;
        snippet: string;
        sourceRef: string;
      }>;
    };
  };
  "search:fulltext": {
    request: {
      limit?: number;
      projectId: string;
      query: string;
    };
    response: {
      items: Array<{
        documentId: string;
        score: number;
        snippet: string;
        title: string;
      }>;
    };
  };
  "search:semantic": {
    request: {
      limit?: number;
      projectId: string;
      queryText: string;
    };
    response: {
      items: Array<{
        chunkId?: string;
        documentId: string;
        score: number;
        snippet: string;
      }>;
    };
  };
  "skill:list": {
    request: {
      includeDisabled?: boolean;
    };
    response: {
      items: Array<{
        enabled: boolean;
        error_code?:
          | "INVALID_ARGUMENT"
          | "NOT_FOUND"
          | "ALREADY_EXISTS"
          | "CONFLICT"
          | "PERMISSION_DENIED"
          | "UNSUPPORTED"
          | "IO_ERROR"
          | "DB_ERROR"
          | "MODEL_NOT_READY"
          | "ENCODING_FAILED"
          | "RATE_LIMITED"
          | "TIMEOUT"
          | "CANCELED"
          | "UPSTREAM_ERROR"
          | "INTERNAL";
        error_message?: string;
        id: string;
        name: string;
        packageId: string;
        scope: "builtin" | "global" | "project";
        valid: boolean;
        version: string;
      }>;
    };
  };
  "skill:read": {
    request: {
      id: string;
    };
    response: {
      content: string;
      id: string;
    };
  };
  "skill:toggle": {
    request: {
      enabled: boolean;
      id: string;
    };
    response: {
      enabled: boolean;
      id: string;
    };
  };
  "skill:write": {
    request: {
      content: string;
      id: string;
    };
    response: {
      id: string;
      scope: "builtin" | "global" | "project";
      written: true;
    };
  };
  "stats:getRange": {
    request: {
      from: string;
      to: string;
    };
    response: {
      days: Array<{
        date: string;
        summary: {
          documentsCreated: number;
          skillsUsed: number;
          wordsWritten: number;
          writingSeconds: number;
        };
      }>;
      from: string;
      summary: {
        documentsCreated: number;
        skillsUsed: number;
        wordsWritten: number;
        writingSeconds: number;
      };
      to: string;
    };
  };
  "stats:getToday": {
    request: Record<string, never>;
    response: {
      date: string;
      summary: {
        documentsCreated: number;
        skillsUsed: number;
        wordsWritten: number;
        writingSeconds: number;
      };
    };
  };
  "version:aiApply:logConflict": {
    request: {
      documentId: string;
      runId: string;
    };
    response: {
      logged: true;
    };
  };
  "version:list": {
    request: {
      documentId: string;
    };
    response: {
      items: Array<{
        actor: "user" | "auto" | "ai";
        contentHash: string;
        createdAt: number;
        reason: string;
        versionId: string;
      }>;
    };
  };
  "version:read": {
    request: {
      documentId: string;
      versionId: string;
    };
    response: {
      actor: "user" | "auto" | "ai";
      contentHash: string;
      contentJson: string;
      contentMd: string;
      contentText: string;
      createdAt: number;
      documentId: string;
      projectId: string;
      reason: string;
      versionId: string;
    };
  };
  "version:restore": {
    request: {
      documentId: string;
      versionId: string;
    };
    response: {
      restored: true;
    };
  };
};

export type IpcRequest<C extends IpcChannel> = IpcChannelSpec[C]["request"];

export type IpcResponseData<C extends IpcChannel> =
  IpcChannelSpec[C]["response"];

export type IpcInvokeResult<C extends IpcChannel> = IpcResponse<
  IpcResponseData<C>
>;
