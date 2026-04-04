import type Database from "better-sqlite3";

import type { Logger } from "../../logging/logger";
import { createDocumentService } from "../documents/documentService";
import type { VersionSnapshotReason } from "../documents/documentService";
import { createKnowledgeGraphService } from "../kg/kgService";
import type { KnowledgeGraphService } from "../kg/types";
import { createMemoryService } from "../memory/memoryService";
import type { MemoryService } from "../memory/memoryService";
import { registerAgenticTools } from "./agenticTools";
import { appendSuggestionToDocument } from "./documentWriteback";
import { buildTool, createToolRegistry, type ToolRegistry } from "./toolRegistry";
import { applySuggestionToSelection } from "./selectionWriteback";

type WritingToolingArgs = {
  db: Database.Database;
  logger: Logger;
  kgService?: Pick<KnowledgeGraphService, "queryRelevant">;
  memoryService?: Pick<MemoryService, "previewInjection">;
};

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
  const kgService =
    args.kgService ??
    createKnowledgeGraphService({
      db: args.db,
      logger: args.logger,
    });
  const memoryService =
    args.memoryService ??
    createMemoryService({
      db: args.db,
      logger: args.logger,
    });

  registerAgenticTools(registry, {
    kgTool: {
      query: async ({ query, entityType, requestId, documentId, projectId }) => {
        args.logger.info("agentic_tool_kg_query", {
          query,
          entityType,
          requestId,
          documentId,
        });
        const scopedProjectId =
          typeof projectId === "string" ? projectId.trim() : "";
        if (scopedProjectId.length === 0 || query.trim().length === 0) {
          return { entities: [], query };
        }

        const relevant = kgService.queryRelevant({
          projectId: scopedProjectId,
          excerpt: query,
        });
        if (!relevant.ok) {
          args.logger.info("agentic_tool_kg_query_degraded", {
            query,
            entityType,
            requestId,
            documentId,
            code: relevant.error.code,
          });
          return { entities: [], query };
        }

        const entities =
          entityType === "character" || entityType === "location"
            ? relevant.data.items.filter((item) => item.type === entityType)
            : relevant.data.items;
        return { entities, query };
      },
    },
    memTool: {
      query: async ({ query, memoryType, requestId, documentId, projectId }) => {
        args.logger.info("agentic_tool_mem_query", {
          query,
          memoryType,
          requestId,
          documentId,
        });
        const scopedProjectId =
          typeof projectId === "string" ? projectId.trim() : "";
        if (scopedProjectId.length === 0) {
          return { memories: [], query };
        }

        const preview = memoryService.previewInjection({
          projectId: scopedProjectId,
          documentId,
          queryText: query,
        });
        if (!preview.ok) {
          args.logger.info("agentic_tool_mem_query_degraded", {
            query,
            memoryType,
            requestId,
            documentId,
            code: preview.error.code,
          });
          return { memories: [], query };
        }

        const memories =
          memoryType === "preference"
            ? preview.data.items.filter((item) => item.type === "preference")
            : preview.data.items;
        return { memories, query };
      },
    },
    documentReader: {
      readDocument: async ({ projectId, documentId, requestId }) => {
        if (!projectId) {
          return { documentId, text: "" };
        }

        const result = service.read({ projectId, documentId });
        if (!result.ok) {
          throw new Error(result.error.message);
        }

        args.logger.info("agentic_tool_doc_read", {
          documentId,
          projectId,
          requestId,
        });
        return {
          documentId,
          text: result.data.contentText,
        };
      },
    },
  });

  return registry;
}
