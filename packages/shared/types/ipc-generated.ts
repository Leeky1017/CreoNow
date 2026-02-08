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
  | "INTERNAL_ERROR"
  | "INVALID_ARGUMENT"
  | "IO_ERROR"
  | "IPC_CHANNEL_FORBIDDEN"
  | "IPC_PAYLOAD_TOO_LARGE"
  | "IPC_SUBSCRIPTION_LIMIT_EXCEEDED"
  | "IPC_TIMEOUT"
  | "MODEL_NOT_READY"
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UNSUPPORTED"
  | "UPSTREAM_ERROR"
  | "VALIDATION_ERROR";

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
  "ai:proxy:test",
  "ai:proxysettings:get",
  "ai:proxysettings:update",
  "ai:skill:cancel",
  "ai:skill:feedback",
  "ai:skill:run",
  "app:system:ping",
  "constraints:policy:get",
  "constraints:policy:set",
  "context:creonow:ensure",
  "context:creonow:status",
  "context:rules:list",
  "context:rules:read",
  "context:settings:list",
  "context:settings:read",
  "context:watch:start",
  "context:watch:stop",
  "db:debug:tablenames",
  "embedding:index:build",
  "embedding:text:encode",
  "export:document:docx",
  "export:document:markdown",
  "export:document:pdf",
  "export:document:txt",
  "file:document:create",
  "file:document:delete",
  "file:document:getcurrent",
  "file:document:list",
  "file:document:read",
  "file:document:reorder",
  "file:document:save",
  "file:document:setcurrent",
  "file:document:update",
  "file:document:updatestatus",
  "judge:model:ensure",
  "judge:model:getstate",
  "kg:entity:create",
  "kg:entity:delete",
  "kg:entity:list",
  "kg:entity:update",
  "kg:graph:get",
  "kg:relation:create",
  "kg:relation:delete",
  "kg:relation:list",
  "kg:relation:update",
  "memory:entry:create",
  "memory:entry:delete",
  "memory:entry:list",
  "memory:entry:update",
  "memory:injection:preview",
  "memory:settings:get",
  "memory:settings:update",
  "project:project:archive",
  "project:project:create",
  "project:project:delete",
  "project:project:duplicate",
  "project:project:getcurrent",
  "project:project:list",
  "project:project:rename",
  "project:project:setcurrent",
  "rag:context:retrieve",
  "search:fulltext:query",
  "search:semantic:query",
  "skill:registry:list",
  "skill:registry:read",
  "skill:registry:toggle",
  "skill:registry:write",
  "stats:day:gettoday",
  "stats:range:get",
  "version:aiapply:logconflict",
  "version:snapshot:list",
  "version:snapshot:read",
  "version:snapshot:restore",
] as const;

export type IpcChannel = (typeof IPC_CHANNELS)[number];

export type IpcChannelSpec = {
  "ai:proxy:test": {
    request: Record<string, never>;
    response: {
      error?: {
        code:
          | "VALIDATION_ERROR"
          | "IPC_TIMEOUT"
          | "IPC_CHANNEL_FORBIDDEN"
          | "IPC_PAYLOAD_TOO_LARGE"
          | "IPC_SUBSCRIPTION_LIMIT_EXCEEDED"
          | "INTERNAL_ERROR"
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
  "ai:proxysettings:get": {
    request: Record<string, never>;
    response: {
      apiKeyConfigured: boolean;
      baseUrl: string;
      enabled: boolean;
    };
  };
  "ai:proxysettings:update": {
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
  "app:system:ping": {
    request: Record<string, never>;
    response: Record<string, never>;
  };
  "constraints:policy:get": {
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
  "constraints:policy:set": {
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
  "context:rules:list": {
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
  "context:rules:read": {
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
  "context:settings:list": {
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
  "context:settings:read": {
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
  "context:watch:start": {
    request: {
      projectId: string;
    };
    response: {
      watching: true;
    };
  };
  "context:watch:stop": {
    request: {
      projectId: string;
    };
    response: {
      watching: false;
    };
  };
  "db:debug:tablenames": {
    request: Record<string, never>;
    response: {
      tableNames: Array<string>;
    };
  };
  "embedding:index:build": {
    request: {
      contentHash: string;
      documentId: string;
    };
    response: {
      accepted: true;
    };
  };
  "embedding:text:encode": {
    request: {
      model?: string;
      texts: Array<string>;
    };
    response: {
      dimension: number;
      vectors: Array<Array<number>>;
    };
  };
  "export:document:docx": {
    request: {
      documentId?: string;
      projectId: string;
    };
    response: {
      bytesWritten: number;
      relativePath: string;
    };
  };
  "export:document:markdown": {
    request: {
      documentId?: string;
      projectId: string;
    };
    response: {
      bytesWritten: number;
      relativePath: string;
    };
  };
  "export:document:pdf": {
    request: {
      documentId?: string;
      projectId: string;
    };
    response: {
      bytesWritten: number;
      relativePath: string;
    };
  };
  "export:document:txt": {
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
      type?: "chapter" | "note" | "setting" | "timeline" | "character";
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
  "file:document:getcurrent": {
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
        parentId?: string;
        sortOrder: number;
        status: "draft" | "final";
        title: string;
        type: "chapter" | "note" | "setting" | "timeline" | "character";
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
      createdAt: number;
      documentId: string;
      parentId?: string;
      projectId: string;
      sortOrder: number;
      status: "draft" | "final";
      title: string;
      type: "chapter" | "note" | "setting" | "timeline" | "character";
      updatedAt: number;
    };
  };
  "file:document:reorder": {
    request: {
      orderedDocumentIds: Array<string>;
      projectId: string;
    };
    response: {
      updated: true;
    };
  };
  "file:document:save": {
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
  "file:document:setcurrent": {
    request: {
      documentId: string;
      projectId: string;
    };
    response: {
      documentId: string;
    };
  };
  "file:document:update": {
    request: {
      documentId: string;
      parentId?: string;
      projectId: string;
      sortOrder?: number;
      status?: "draft" | "final";
      title?: string;
      type?: "chapter" | "note" | "setting" | "timeline" | "character";
    };
    response: {
      updated: true;
    };
  };
  "file:document:updatestatus": {
    request: {
      documentId: string;
      projectId: string;
      status: "draft" | "final";
    };
    response: {
      status: "draft" | "final";
      updated: true;
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
                | "VALIDATION_ERROR"
                | "IPC_TIMEOUT"
                | "IPC_CHANNEL_FORBIDDEN"
                | "IPC_PAYLOAD_TOO_LARGE"
                | "IPC_SUBSCRIPTION_LIMIT_EXCEEDED"
                | "INTERNAL_ERROR"
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
  "judge:model:getstate": {
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
                | "VALIDATION_ERROR"
                | "IPC_TIMEOUT"
                | "IPC_CHANNEL_FORBIDDEN"
                | "IPC_PAYLOAD_TOO_LARGE"
                | "IPC_SUBSCRIPTION_LIMIT_EXCEEDED"
                | "INTERNAL_ERROR"
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
  "memory:entry:create": {
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
  "memory:entry:delete": {
    request: {
      memoryId: string;
    };
    response: {
      deleted: true;
    };
  };
  "memory:entry:list": {
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
  "memory:entry:update": {
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
  "project:project:archive": {
    request: {
      archived: boolean;
      projectId: string;
    };
    response: {
      archived: boolean;
      archivedAt?: number;
      projectId: string;
    };
  };
  "project:project:create": {
    request: {
      name?: string;
    };
    response: {
      projectId: string;
      rootPath: string;
    };
  };
  "project:project:delete": {
    request: {
      projectId: string;
    };
    response: {
      deleted: true;
    };
  };
  "project:project:duplicate": {
    request: {
      projectId: string;
    };
    response: {
      name: string;
      projectId: string;
      rootPath: string;
    };
  };
  "project:project:getcurrent": {
    request: Record<string, never>;
    response: {
      projectId: string;
      rootPath: string;
    };
  };
  "project:project:list": {
    request: {
      includeArchived?: boolean;
    };
    response: {
      items: Array<{
        archivedAt?: number;
        name: string;
        projectId: string;
        rootPath: string;
        updatedAt: number;
      }>;
    };
  };
  "project:project:rename": {
    request: {
      name: string;
      projectId: string;
    };
    response: {
      name: string;
      projectId: string;
      updatedAt: number;
    };
  };
  "project:project:setcurrent": {
    request: {
      projectId: string;
    };
    response: {
      projectId: string;
      rootPath: string;
    };
  };
  "rag:context:retrieve": {
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
  "search:fulltext:query": {
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
  "search:semantic:query": {
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
  "skill:registry:list": {
    request: {
      includeDisabled?: boolean;
    };
    response: {
      items: Array<{
        enabled: boolean;
        error_code?:
          | "VALIDATION_ERROR"
          | "IPC_TIMEOUT"
          | "IPC_CHANNEL_FORBIDDEN"
          | "IPC_PAYLOAD_TOO_LARGE"
          | "IPC_SUBSCRIPTION_LIMIT_EXCEEDED"
          | "INTERNAL_ERROR"
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
  "skill:registry:read": {
    request: {
      id: string;
    };
    response: {
      content: string;
      id: string;
    };
  };
  "skill:registry:toggle": {
    request: {
      enabled: boolean;
      id: string;
    };
    response: {
      enabled: boolean;
      id: string;
    };
  };
  "skill:registry:write": {
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
  "stats:day:gettoday": {
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
  "stats:range:get": {
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
  "version:aiapply:logconflict": {
    request: {
      documentId: string;
      runId: string;
    };
    response: {
      logged: true;
    };
  };
  "version:snapshot:list": {
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
  "version:snapshot:read": {
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
  "version:snapshot:restore": {
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
