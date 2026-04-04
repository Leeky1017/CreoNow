/**
 * V1 Agentic Read-Only Tools
 *
 * read_document_section — 读取文档片段
 * search_versions — 搜索版本历史
 * get_word_count — 获取字数统计
 *
 * 这些工具仅限只读操作。documentWrite 不暴露给 AI 自主调用。
 */

import { buildTool } from "./toolRegistry";
import type { WritingTool, ToolContext, ToolResult, ToolRegistry } from "./toolRegistry";

// ─── Tool names ─────────────────────────────────────────────────────

const TOOL_NAME_READ_SECTION = "read_document_section";
const TOOL_NAME_SEARCH_VERSIONS = "search_versions";
const TOOL_NAME_GET_WORD_COUNT = "get_word_count";

/** Blocked tool names — never registered in the agentic tool registry */
const BLOCKED_TOOLS = new Set(["documentWrite", "document_write"]);

export function isToolBlocked(name: string): boolean {
  return BLOCKED_TOOLS.has(name);
}

// ─── Service interfaces ─────────────────────────────────────────────

export interface DocumentReader {
  readSection(documentId: string, from: number, to: number): Promise<{ text: string; wordCount: number }>;
}

export interface VersionSearcher {
  searchVersions(
    documentId: string,
    query: string,
    limit: number,
  ): Promise<ReadonlyArray<{ versionId: string; summary: string; createdAt: number }>>;
}

export interface WordCounter {
  getWordCount(documentId: string): Promise<{ wordCount: number; charCount: number }>;
}

export interface AgenticToolDeps {
  documentReader: DocumentReader;
  versionSearcher: VersionSearcher;
  wordCounter: WordCounter;
}

// ─── Tool factories ─────────────────────────────────────────────────

function createReadDocumentSectionTool(deps: AgenticToolDeps): WritingTool {
  return buildTool({
    name: TOOL_NAME_READ_SECTION,
    description: "Read a section of the current document by character offset range",
    isConcurrencySafe: true,
    execute: async (ctx: ToolContext): Promise<ToolResult> => {
      const args = (ctx as { args?: Record<string, unknown> }).args ?? {};
      const from = typeof args.from === "number" ? args.from : 0;
      const to = typeof args.to === "number" ? args.to : 1000;

      try {
        const result = await deps.documentReader.readSection(ctx.documentId, from, to);
        return { success: true, data: result };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: { code: "READ_SECTION_FAILED", message } };
      }
    },
  });
}

function createSearchVersionsTool(deps: AgenticToolDeps): WritingTool {
  return buildTool({
    name: TOOL_NAME_SEARCH_VERSIONS,
    description: "Search the version history of the current document",
    isConcurrencySafe: true,
    execute: async (ctx: ToolContext): Promise<ToolResult> => {
      const args = (ctx as { args?: Record<string, unknown> }).args ?? {};
      const query = typeof args.query === "string" ? args.query : "";
      const limit = typeof args.limit === "number" ? args.limit : 10;

      try {
        const results = await deps.versionSearcher.searchVersions(ctx.documentId, query, limit);
        return { success: true, data: results };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: { code: "SEARCH_VERSIONS_FAILED", message } };
      }
    },
  });
}

function createGetWordCountTool(deps: AgenticToolDeps): WritingTool {
  return buildTool({
    name: TOOL_NAME_GET_WORD_COUNT,
    description: "Get the current word count and character count of the document",
    isConcurrencySafe: true,
    execute: async (ctx: ToolContext): Promise<ToolResult> => {
      try {
        const result = await deps.wordCounter.getWordCount(ctx.documentId);
        return { success: true, data: result };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: { code: "WORD_COUNT_FAILED", message } };
      }
    },
  });
}

// ─── Registration ───────────────────────────────────────────────────

/**
 * Register all V1 read-only tools into the given registry.
 * Returns a cleanup function that unregisters all tools.
 */
export function registerAgenticTools(
  registry: ToolRegistry,
  deps: AgenticToolDeps,
): () => void {
  const tools = [
    createReadDocumentSectionTool(deps),
    createSearchVersionsTool(deps),
    createGetWordCountTool(deps),
  ];

  for (const tool of tools) {
    if (isToolBlocked(tool.name)) continue;
    registry.register(tool);
  }

  return () => {
    for (const tool of tools) {
      registry.unregister(tool.name);
    }
  };
}

/** Names of all V1 agentic tools (for documentation/validation) */
export const V1_TOOL_NAMES = [
  TOOL_NAME_READ_SECTION,
  TOOL_NAME_SEARCH_VERSIONS,
  TOOL_NAME_GET_WORD_COUNT,
] as const;
