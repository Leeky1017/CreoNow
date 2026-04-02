/**
 * ToolRegistry — V1 Tool 注册表
 *
 * register/unregister/get/list — 管理 WritingTool 实例
 * buildTool — 工厂函数，isConcurrencySafe 默认 false
 */

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: { code: string; message: string; details?: unknown; retryable?: boolean };
}

export interface ToolContext {
  documentId: string;
  requestId: string;
  selection?: { from: number; to: number; text: string; selectionTextHash: string };
  [key: string]: unknown;
}

export interface WritingTool {
  readonly name: string;
  readonly description: string;
  readonly isConcurrencySafe: boolean;
  execute: (ctx: ToolContext) => Promise<ToolResult>;
}

export interface ToolRegistry {
  register(tool: WritingTool): void;
  unregister(name: string): boolean;
  get(name: string): WritingTool | undefined;
  list(): ReadonlyArray<WritingTool>;
}

export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, WritingTool>();

  return {
    register(tool: WritingTool): void {
      if (tools.has(tool.name)) {
        throw new Error(`Tool "${tool.name}" is already registered`);
      }
      tools.set(tool.name, tool);
    },

    unregister(name: string): boolean {
      return tools.delete(name);
    },

    get(name: string): WritingTool | undefined {
      return tools.get(name);
    },

    list(): ReadonlyArray<WritingTool> {
      return [...tools.values()];
    },
  };
}

type BuildToolConfig = {
  name: string;
  description: string;
  isConcurrencySafe?: boolean;
  execute: (ctx: ToolContext) => Promise<ToolResult>;
};

export function buildTool(config: BuildToolConfig): WritingTool {
  return {
    name: config.name,
    description: config.description,
    isConcurrencySafe: config.isConcurrencySafe ?? false,
    execute: config.execute,
  };
}
