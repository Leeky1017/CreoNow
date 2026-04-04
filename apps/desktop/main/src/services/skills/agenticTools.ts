import { estimateTokens } from "../context/tokenEstimation";
import { buildTool } from "./toolRegistry";
import type { ToolContext, ToolRegistry, ToolResult, WritingTool } from "./toolRegistry";

type AgenticArgs = Record<string, unknown>;

export interface KgToolQuery {
  documentId: string;
  query: string;
  entityType?: "character" | "location" | "worldSetting";
  requestId: string;
}

export interface MemToolQuery {
  documentId: string;
  query: string;
  memoryType?: "preference" | "style" | "rule";
  requestId: string;
}

export interface ReadDocumentArgs {
  projectId?: string;
  documentId: string;
  requestId: string;
}

export interface AgenticToolDeps {
  kgTool: {
    query(args: KgToolQuery): Promise<unknown>;
  };
  memTool: {
    query(args: MemToolQuery): Promise<unknown>;
  };
  documentReader: {
    readDocument(args: ReadDocumentArgs): Promise<{
      documentId: string;
      text: string;
    }>;
  };
}

const BLOCKED_TOOLS = new Set(["documentWrite", "document_write", "versionSnapshot"]);

export const AGENTIC_TOOL_NAMES = [
  "kgTool",
  "memTool",
  "docTool",
  "documentRead",
] as const;

export function isToolBlocked(name: string): boolean {
  return BLOCKED_TOOLS.has(name);
}

function readAgenticArgs(ctx: ToolContext): AgenticArgs {
  const args = ctx["args"];
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return {};
  }
  return args as AgenticArgs;
}

function readProjectId(ctx: ToolContext): string | undefined {
  const projectId = ctx["projectId"];
  if (typeof projectId !== "string") {
    return undefined;
  }
  const normalized = projectId.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function sliceSnippet(args: {
  text: string;
  query: string;
  maxTokens?: number;
  snippetChars?: number;
}): { snippet: string; truncated: boolean } {
  const normalized = args.text.trim();
  if (normalized.length === 0) {
    return { snippet: "", truncated: false };
  }

  const tokenBound =
    typeof args.maxTokens === "number" &&
    Number.isFinite(args.maxTokens) &&
    args.maxTokens > 0
      ? Math.max(1, Math.floor(args.maxTokens) * 4)
      : normalized.length;
  const charBound =
    typeof args.snippetChars === "number" &&
    Number.isFinite(args.snippetChars) &&
    args.snippetChars > 0
      ? Math.max(1, Math.floor(args.snippetChars))
      : normalized.length;
  const limit = Math.min(normalized.length, tokenBound, charBound);
  const query = args.query.trim();

  if (query.length === 0) {
    const snippet = normalized.slice(0, limit);
    return {
      snippet,
      truncated: estimateTokens(normalized) > estimateTokens(snippet),
    };
  }

  const hitIndex = normalized.indexOf(query);
  if (hitIndex < 0) {
    const snippet = normalized.slice(0, limit);
    return {
      snippet,
      truncated: estimateTokens(normalized) > estimateTokens(snippet),
    };
  }

  const leftBudget = Math.max(0, Math.floor((limit - query.length) / 2));
  const start = Math.max(0, hitIndex - leftBudget);
  const end = Math.min(normalized.length, start + limit);
  const alignedStart = Math.max(0, end - limit);
  const snippet = normalized.slice(alignedStart, end);
  return {
    snippet,
    truncated: estimateTokens(normalized) > estimateTokens(snippet),
  };
}

function buildKgTool(deps: AgenticToolDeps): WritingTool {
  return buildTool({
    name: "kgTool",
    description: "Query the knowledge graph for character traits, locations, and world settings",
    isConcurrencySafe: true,
    execute: async (ctx): Promise<ToolResult> => {
      const args = readAgenticArgs(ctx);
      const query = typeof args.query === "string" ? args.query : "";
      const entityType =
        args.entityType === "character" ||
        args.entityType === "location" ||
        args.entityType === "worldSetting"
          ? args.entityType
          : undefined;

      try {
        return {
          success: true,
          data: await deps.kgTool.query({
            documentId: ctx.documentId,
            query,
            ...(entityType ? { entityType } : {}),
            requestId: ctx.requestId,
          }),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: { code: "KG_TOOL_FAILED", message },
        };
      }
    },
  });
}

function buildMemTool(deps: AgenticToolDeps): WritingTool {
  return buildTool({
    name: "memTool",
    description: "Query user writing preferences and semantic memory",
    isConcurrencySafe: true,
    execute: async (ctx): Promise<ToolResult> => {
      const args = readAgenticArgs(ctx);
      const query = typeof args.query === "string" ? args.query : "";
      const memoryType =
        args.memoryType === "preference" ||
        args.memoryType === "style" ||
        args.memoryType === "rule"
          ? args.memoryType
          : undefined;

      try {
        return {
          success: true,
          data: await deps.memTool.query({
            documentId: ctx.documentId,
            query,
            ...(memoryType ? { memoryType } : {}),
            requestId: ctx.requestId,
          }),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: { code: "MEM_TOOL_FAILED", message },
        };
      }
    },
  });
}

async function executeDocumentRead(args: {
  ctx: ToolContext;
  deps: AgenticToolDeps;
  targetDocumentId: string;
  responseKey: "content" | "text";
}): Promise<ToolResult> {
  const toolArgs = readAgenticArgs(args.ctx);
  const query = typeof toolArgs.query === "string" ? toolArgs.query : "";
  const maxTokens =
    typeof toolArgs.maxTokens === "number" ? toolArgs.maxTokens : undefined;
  const snippetChars =
    typeof toolArgs.snippetChars === "number" ? toolArgs.snippetChars : undefined;

  try {
    const result = await args.deps.documentReader.readDocument({
      projectId: readProjectId(args.ctx),
      documentId: args.targetDocumentId,
      requestId: args.ctx.requestId,
    });
    const { snippet, truncated } = sliceSnippet({
      text: result.text,
      query,
      maxTokens,
      snippetChars,
    });

    return {
      success: true,
      data: {
        [args.responseKey]: snippet,
        documentId: args.targetDocumentId,
        query,
        truncated,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: {
        code:
          args.responseKey === "content" ? "DOC_TOOL_FAILED" : "DOCUMENT_READ_FAILED",
        message,
      },
    };
  }
}

function buildDocTool(deps: AgenticToolDeps): WritingTool {
  return buildTool({
    name: "docTool",
    description: "Read a snippet of another document or chapter for context",
    isConcurrencySafe: true,
    execute: async (ctx) => {
      const args = readAgenticArgs(ctx);
      const documentId =
        typeof args.documentId === "string" && args.documentId.trim().length > 0
          ? args.documentId.trim()
          : ctx.documentId;
      return await executeDocumentRead({
        ctx,
        deps,
        targetDocumentId: documentId,
        responseKey: "content",
      });
    },
  });
}

function buildDocumentReadTool(deps: AgenticToolDeps): WritingTool {
  return buildTool({
    name: "documentRead",
    description: "Read the current document text with snippet budgeting",
    isConcurrencySafe: true,
    execute: async (ctx) =>
      await executeDocumentRead({
        ctx,
        deps,
        targetDocumentId: ctx.documentId,
        responseKey: "text",
      }),
  });
}

export function registerAgenticTools(
  registry: ToolRegistry,
  deps: AgenticToolDeps,
): () => void {
  const tools = [
    buildKgTool(deps),
    buildMemTool(deps),
    buildDocTool(deps),
    buildDocumentReadTool(deps),
  ];

  for (const tool of tools) {
    if (!isToolBlocked(tool.name)) {
      registry.register(tool);
    }
  }

  return () => {
    for (const tool of tools) {
      registry.unregister(tool.name);
    }
  };
}
