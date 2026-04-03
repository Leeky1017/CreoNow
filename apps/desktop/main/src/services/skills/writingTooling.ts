import type Database from "better-sqlite3";

import type { Logger } from "../../logging/logger";
import { createDocumentService } from "../documents/documentService";
import type { VersionSnapshotReason } from "../documents/documentService";
import { appendSuggestionToDocument } from "./documentWriteback";
import { buildTool, createToolRegistry, type ToolRegistry } from "./toolRegistry";
import { applySuggestionToSelection } from "./selectionWriteback";

type WritingToolingArgs = {
  db: Database.Database;
  logger: Logger;
};

function readDocument(args: WritingToolingArgs, ctx: Record<string, unknown>) {
  const projectId =
    typeof ctx.projectId === "string" ? ctx.projectId.trim() : "";
  if (projectId.length === 0) {
    return {
      success: false as const,
      error: { code: "DOCUMENT_READ_FAILED", message: "projectId is required" },
    };
  }

  const service = createDocumentService({ db: args.db, logger: args.logger });
  const current = service.read({
    projectId,
    documentId: String(ctx.documentId ?? ""),
  });
  if (!current.ok) {
    return {
      success: false as const,
      error: {
        code: current.error.code,
        message: current.error.message,
        details: current.error.details,
        retryable: current.error.retryable,
      },
    };
  }

  return {
    success: true as const,
    data: {
      projectId,
      documentId: String(ctx.documentId ?? ""),
      title: current.data.title,
      content: current.data.contentText,
      contentJson: current.data.contentJson,
      cursorPosition:
        typeof ctx.cursorPosition === "number" ? ctx.cursorPosition : null,
      selection: ctx.selection ?? null,
    },
  };
}

export function createWritingToolRegistry(args: WritingToolingArgs): ToolRegistry {
  const registry = createToolRegistry();

  registry.register(
    buildTool({
      name: "documentWrite",
      description: "Apply confirmed AI suggestion to current selection",
      isConcurrencySafe: false,
      execute: async (ctx) => {
        const projectId =
          typeof ctx.projectId === "string" ? ctx.projectId.trim() : "";
        if (projectId.length === 0) {
          return {
            success: false,
            error: { code: "WRITE_BACK_FAILED", message: "projectId is required" },
          };
        }

        const suggestion = typeof ctx.content === "string" ? ctx.content : "";
        const service = createDocumentService({ db: args.db, logger: args.logger });
        const current = service.read({
          projectId,
          documentId: ctx.documentId,
        });
        if (!current.ok) {
          return {
            success: false,
            error: {
              code: current.error.code,
              message: current.error.message,
              details: current.error.details,
              retryable: current.error.retryable,
            },
          };
        }

        let parsedContent: unknown;
        try {
          parsedContent = JSON.parse(current.data.contentJson);
        } catch {
          return {
            success: false,
            error: {
              code: "WRITE_BACK_FAILED",
              message: "Stored document contentJson is invalid JSON",
            },
          };
        }

        const applied = ctx.selection
          ? applySuggestionToSelection({
              contentJson: parsedContent,
              selection: ctx.selection,
              suggestion,
            })
          : appendSuggestionToDocument({
              contentJson: parsedContent,
              cursorPosition:
                typeof ctx.cursorPosition === "number" ? ctx.cursorPosition : undefined,
              suggestion,
            });
        if (!applied.ok) {
          return {
            success: false,
            error: applied.error,
          };
        }

        const saved = service.save({
          projectId,
          documentId: ctx.documentId,
          contentJson: applied.data.contentJson,
          actor: "ai",
          reason: "ai-accept",
        });
        if (!saved.ok) {
          return {
            success: false,
            error: {
              code: saved.error.code,
              message: saved.error.message,
              details: saved.error.details,
              retryable: saved.error.retryable,
            },
          };
        }

        return {
          success: true,
          data: {
            versionId: saved.data.versionId,
            contentHash: saved.data.contentHash,
          },
        };
      },
    }),
  );

  registry.register(
    buildTool({
      name: "versionSnapshot",
      description: "Create manuscript safety snapshot before writeback",
      isConcurrencySafe: false,
      execute: async (ctx) => {
        const projectId =
          typeof ctx.projectId === "string" ? ctx.projectId.trim() : "";
        if (projectId.length === 0) {
          return {
            success: false,
            error: { code: "VERSION_SNAPSHOT_FAILED", message: "projectId is required" },
          };
        }

        const actor =
          ctx.actor === "user" || ctx.actor === "auto" || ctx.actor === "ai"
            ? ctx.actor
            : "auto";
        const reason =
          typeof ctx.reason === "string" ? ctx.reason : "pre-write";

        const service = createDocumentService({ db: args.db, logger: args.logger });
        const current = service.read({
          projectId,
          documentId: ctx.documentId,
        });
        if (!current.ok) {
          return {
            success: false,
            error: {
              code: current.error.code,
              message: current.error.message,
              details: current.error.details,
              retryable: current.error.retryable,
            },
          };
        }

        let parsedContent: unknown;
        try {
          parsedContent = JSON.parse(current.data.contentJson);
        } catch {
          return {
            success: false,
            error: {
              code: "VERSION_SNAPSHOT_FAILED",
              message: "Stored document contentJson is invalid JSON",
            },
          };
        }

        const saved = service.save({
          projectId,
          documentId: ctx.documentId,
          contentJson: parsedContent,
          actor,
          reason: reason as VersionSnapshotReason,
        });
        if (!saved.ok) {
          return {
            success: false,
            error: {
              code: saved.error.code,
              message: saved.error.message,
              details: saved.error.details,
              retryable: saved.error.retryable,
            },
          };
        }

        return {
          success: true,
          data: {
            versionId: saved.data.versionId,
            contentHash: saved.data.contentHash,
          },
        };
      },
    }),
  );

  return registry;
}

export function createAgenticToolRegistry(
  args: WritingToolingArgs,
): ToolRegistry {
  const registry = createToolRegistry();

  const buildReadDocumentTool = (name: string, description: string) =>
    buildTool({
      name,
      description,
      isConcurrencySafe: true,
      execute: async (ctx) => readDocument(args, ctx),
    });

  registry.register(
    buildReadDocumentTool(
      "documentRead",
      "Read current document content for agentic reasoning",
    ),
  );
  registry.register(
    buildReadDocumentTool(
      "docTool",
      "Read current document context for agentic reasoning",
    ),
  );

  registry.register(
    buildTool({
      name: "kgTool",
      description: "Read-only knowledge graph lookup",
      isConcurrencySafe: true,
      execute: async (ctx) => ({
        success: true,
        data: {
          query:
            typeof ctx.arguments === "object" &&
            ctx.arguments !== null &&
            typeof (ctx.arguments as Record<string, unknown>).query === "string"
              ? (ctx.arguments as Record<string, unknown>).query
              : "",
          items: [],
        },
      }),
    }),
  );

  registry.register(
    buildTool({
      name: "memTool",
      description: "Read-only memory lookup",
      isConcurrencySafe: true,
      execute: async (ctx) => ({
        success: true,
        data: {
          query:
            typeof ctx.arguments === "object" &&
            ctx.arguments !== null &&
            typeof (ctx.arguments as Record<string, unknown>).query === "string"
              ? (ctx.arguments as Record<string, unknown>).query
              : "",
          memories: [],
        },
      }),
    }),
  );

  return registry;
}
