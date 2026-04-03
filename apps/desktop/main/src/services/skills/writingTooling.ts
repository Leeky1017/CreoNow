import type Database from "better-sqlite3";

import type { Logger } from "../../logging/logger";
import { createDocumentService } from "../documents/documentService";
import type { VersionSnapshotReason } from "../documents/documentService";
import { appendSuggestionToDocument } from "./documentWriteback";
import {
  buildTool,
  createToolRegistry,
  type AgenticToolContext,
  type ToolRegistry,
} from "./toolRegistry";
import { applySuggestionToSelection } from "./selectionWriteback";

type WritingToolingArgs = {
  db: Database.Database;
  logger: Logger;
};

function readAgenticArgs(ctx: unknown): Record<string, unknown> {
  if (
    typeof ctx === "object" &&
    ctx !== null &&
    "args" in ctx &&
    typeof (ctx as { args?: unknown }).args === "object" &&
    (ctx as { args?: unknown }).args !== null
  ) {
    return (ctx as AgenticToolContext).args;
  }
  return {};
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

/**
 * P2: Create a read-only agentic tool registry for use in the Agentic Loop.
 *
 * Only exposes tools that AI is permitted to call autonomously:
 * - kgTool: query knowledge graph (read-only)
 * - memTool: query writing memory (read-only)
 * - docTool: read document content (read-only)
 * - documentRead: read document text (P1 built-in, read-only)
 *
 * Intentionally EXCLUDES: documentWrite, versionSnapshot
 * (AI must not be able to write documents autonomously)
 */
export function createAgenticToolRegistry(args: WritingToolingArgs): ToolRegistry {
  const registry = createToolRegistry();
  const service = createDocumentService({ db: args.db, logger: args.logger });

  registry.register(
    buildTool({
      name: "kgTool",
      description:
        "Query the knowledge graph for character traits, locations, and world settings",
      isConcurrencySafe: true,
      execute: async (ctx) => {
        const toolArgs = readAgenticArgs(ctx);
        const query = typeof toolArgs.query === "string" ? toolArgs.query : "";
        args.logger.info("agentic_tool_kg_query", {
          query,
          requestId: ctx.requestId,
        });
        return {
          success: true,
          data: { entities: [], query },
        };
      },
    }),
  );

  registry.register(
    buildTool({
      name: "memTool",
      description:
        "Query writing memory for style preferences and past writing patterns",
      isConcurrencySafe: true,
      execute: async (ctx) => {
        const toolArgs = readAgenticArgs(ctx);
        const query = typeof toolArgs.query === "string" ? toolArgs.query : "";
        args.logger.info("agentic_tool_mem_query", {
          query,
          requestId: ctx.requestId,
        });
        return {
          success: true,
          data: { memories: [], query },
        };
      },
    }),
  );

  registry.register(
    buildTool({
      name: "docTool",
      description: "Read the content of a document or chapter for context",
      isConcurrencySafe: true,
      execute: async (ctx) => {
        const toolArgs = readAgenticArgs(ctx);
        const targetDocId =
          typeof toolArgs.targetDocumentId === "string"
            ? toolArgs.targetDocumentId
            : ctx.documentId;
        const projectId =
          typeof ctx.projectId === "string" ? ctx.projectId.trim() : "";

        if (!projectId) {
          return { success: true, data: "" };
        }

        const result = service.read({ projectId, documentId: targetDocId });
        if (!result.ok) {
          return {
            success: false,
            error: { code: result.error.code, message: result.error.message },
          };
        }

        return {
          success: true,
          data: result.data.contentText,
        };
      },
    }),
  );

  registry.register(
    buildTool({
      name: "documentRead",
      description: "Read the raw text of the current document",
      isConcurrencySafe: true,
      execute: async (ctx) => {
        const projectId =
          typeof ctx.projectId === "string" ? ctx.projectId.trim() : "";

        if (!projectId) {
          return { success: true, data: "" };
        }

        const result = service.read({ projectId, documentId: ctx.documentId });
        if (!result.ok) {
          return {
            success: false,
            error: { code: result.error.code, message: result.error.message },
          };
        }

        return {
          success: true,
          data: result.data.contentText,
        };
      },
    }),
  );

  return registry;
}
