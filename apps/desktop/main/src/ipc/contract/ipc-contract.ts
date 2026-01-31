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
        rating: s.union(s.literal("up"), s.literal("down")),
        comment: s.optional(s.string()),
      }),
      response: s.object({ recorded: s.literal(true) }),
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
    "file:document:write": {
      request: s.object({
        projectId: s.string(),
        documentId: s.string(),
        contentJson: s.string(),
        actor: s.union(s.literal("user"), s.literal("auto")),
        reason: s.union(s.literal("manual-save"), s.literal("autosave")),
      }),
      response: s.object({ updatedAt: s.number(), contentHash: s.string() }),
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
  },
} as const;
