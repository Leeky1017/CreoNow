import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import type { IpcMain } from "electron";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SKILL_STREAM_DONE_CHANNEL,
  SKILL_TOOL_USE_CHANNEL,
  type SkillToolUseEvent,
} from "@shared/types/ai";
import type { Logger } from "../../logging/logger";
import { registerAiIpcHandlers } from "../ai";
import { registerVersionIpcHandlers } from "../version";
import { createDocumentService } from "../../services/documents/documentService";
import { computeSelectionTextHash } from "../../services/editor/prosemirrorSchema";

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../db/migrations",
);

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;
type MockSender = {
  id: number;
  send: (channel: string, payload: unknown) => void;
};

type FetchBody = {
  tools?: unknown[];
  messages?: Array<{
    role?: string;
    content?: unknown;
    tool_call_id?: string;
    tool_calls?: unknown;
  }>;
  system?: unknown;
};

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function applyAllMigrations(db: Database.Database): void {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql") && !file.includes("vec"))
    .sort();
  for (const file of files) {
    db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
  }
}

function createHarness(args?: {
  env?: Partial<NodeJS.ProcessEnv>;
}) {
  const handlers = new Map<string, Handler>();
  const sentEvents: Array<{ channel: string; payload: unknown }> = [];
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  applyAllMigrations(db);

  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  registerAiIpcHandlers({
    ipcMain,
    db,
    userDataDir: "<test-user-data>",
    builtinSkillsDir: path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../skills/packages",
    ),
    logger: createLogger(),
    env: {
      ...process.env,
      CREONOW_AI_PROVIDER: "openai",
      CREONOW_AI_MODEL: "gpt-5.2",
      CREONOW_AI_API_KEY: "sk-test",
      CREONOW_AI_BASE_URL: "https://api.openai.com",
      ...args?.env,
    },
  });
  registerVersionIpcHandlers({
    ipcMain,
    db,
    logger: createLogger(),
  });

  return {
    db,
    sentEvents,
    async invoke<T>(channel: string, payload: unknown): Promise<T> {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`Missing handler: ${channel}`);
      }
      const sender: MockSender = {
        id: 1,
        send: (eventChannel, eventPayload) => {
          sentEvents.push({ channel: eventChannel, payload: eventPayload });
        },
      };
      return (await handler({ sender }, payload)) as T;
    },
  };
}

function createProjectAndDocument(args: {
  db: Database.Database;
  title: string;
  text: string;
}) {
  const projectId = "proj-1";
  args.db
    .prepare(
      "INSERT OR IGNORE INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(projectId, "测试项目", "/worktree/test-root", Date.now(), Date.now());

  const service = createDocumentService({ db: args.db, logger: createLogger() });
  const created = service.create({
    projectId,
    title: args.title,
    type: "chapter",
  });
  if (!created.ok) {
    throw new Error(created.error.message);
  }

  const saved = service.save({
    projectId,
    documentId: created.data.documentId,
    contentJson: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: args.text }],
        },
      ],
    },
    actor: "user",
    reason: "manual-save",
  });
  if (!saved.ok) {
    throw new Error(saved.error.message);
  }

  return {
    projectId,
    documentId: created.data.documentId,
  };
}

function openAiStreamResponse(frames: unknown[]): Response {
  const body = `${frames
    .map((frame) => `data: ${JSON.stringify(frame)}\n\n`)
    .join("")}data: [DONE]\n\n`;
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

function openAiToolUseFrame(args: {
  text: string;
  toolName: string;
  toolCallId: string;
  toolArgs: Record<string, unknown>;
}): unknown[] {
  return [
    {
      choices: [
        {
          delta: {
            content: args.text,
            tool_calls: [
              {
                index: 0,
                id: args.toolCallId,
                type: "function",
                function: {
                  name: args.toolName,
                  arguments: JSON.stringify(args.toolArgs),
                },
              },
            ],
          },
          finish_reason: null,
        },
      ],
    },
    {
      choices: [
        {
          delta: {},
          finish_reason: "tool_use",
        },
      ],
    },
  ];
}

function openAiStopFrame(text: string): unknown[] {
  return [
    {
      choices: [
        {
          delta: {
            content: text,
          },
          finish_reason: null,
        },
      ],
    },
    {
      choices: [
        {
          delta: {},
          finish_reason: "stop",
        },
      ],
    },
  ];
}

function anthropicStreamResponse(events: Array<{ event: string; data: unknown }>): Response {
  const body = `${events
    .map(
      (item) =>
        `event: ${item.event}\n` +
        `data: ${JSON.stringify(item.data)}\n\n`,
    )
    .join("")}`;
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

function anthropicToolUseFrames(args: {
  text: string;
  toolName: string;
  toolUseId: string;
  toolArgs: Record<string, unknown>;
}): Array<{ event: string; data: unknown }> {
  return [
    {
      event: "content_block_delta",
      data: {
        index: 0,
        delta: {
          type: "text_delta",
          text: args.text,
        },
      },
    },
    {
      event: "content_block_start",
      data: {
        index: 1,
        content_block: {
          type: "tool_use",
          id: args.toolUseId,
          name: args.toolName,
          input: args.toolArgs,
        },
      },
    },
    {
      event: "message_delta",
      data: {
        delta: {
          stop_reason: "tool_use",
        },
      },
    },
    {
      event: "message_stop",
      data: {},
    },
  ];
}

function anthropicStopFrames(text: string): Array<{ event: string; data: unknown }> {
  return [
    {
      event: "content_block_delta",
      data: {
        index: 0,
        delta: {
          type: "text_delta",
          text,
        },
      },
    },
    {
      event: "message_delta",
      data: {
        delta: {
          stop_reason: "end_turn",
        },
      },
    },
    {
      event: "message_stop",
      data: {},
    },
  ];
}

describe("ai:skill:run P2 生产闭环", () => {
  const opened: Database.Database[] = [];
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    for (const db of opened.splice(0)) {
      db.close();
    }
  });

  it("selection + userInstruction 在真实执行链路里会以转义后的 prompt 进入模型请求", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const current = createProjectAndDocument({
      db: harness.db,
      title: "当前章节",
      text: "夜色降临。",
    });

    const requestBodies: FetchBody[] = [];
    globalThis.fetch = vi.fn(async (_input, init) => {
      requestBodies.push(JSON.parse(String(init?.body ?? "{}")) as FetchBody);
      return openAiStreamResponse(openAiStopFrame("润色结果"));
    }) as typeof fetch;

    const run = await harness.invoke<{
      ok: boolean;
      data?: { status: "preview" | "completed" | "rejected"; outputText?: string };
    }>("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      input: "原文</text><leak/>",
      userInstruction: "收紧节奏，并保留 </instruction> 边界",
      mode: "ask",
      model: "gpt-5.2",
      context: current,
      selection: {
        from: 1,
        to: 15,
        text: "原文</text><leak/>",
        selectionTextHash: computeSelectionTextHash("原文</text><leak/>"),
      },
      stream: true,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");
    expect(requestBodies).toHaveLength(1);
    const userMessage = requestBodies[0]?.messages?.find((message) => message.role === "user");
    expect(typeof userMessage?.content).toBe("string");
    const prompt = String(userMessage?.content ?? "");
    expect(prompt).toContain("Selected text:");
    expect(prompt).toContain("User instruction:");
    expect(prompt).toContain("原文&lt;/text&gt;&lt;leak/&gt;");
    expect(prompt).toContain("收紧节奏，并保留 &lt;/instruction&gt; 边界");
    expect(prompt).not.toContain("原文</text><leak/>");
    expect(prompt).not.toContain("</instruction>");
  });

  it("continue 的 document-window 输入在真实执行链路里不会击穿 <input> 边界", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const current = createProjectAndDocument({
      db: harness.db,
      title: "当前章节",
      text: "夜幕将落。",
    });

    const requestBodies: FetchBody[] = [];
    globalThis.fetch = vi.fn(async (_input, init) => {
      requestBodies.push(JSON.parse(String(init?.body ?? "{}")) as FetchBody);
      return openAiStreamResponse(openAiStopFrame("续写结果"));
    }) as typeof fetch;

    const run = await harness.invoke<{
      ok: boolean;
      data?: { status: "preview" | "completed" | "rejected"; outputText?: string };
    }>("ai:skill:run", {
      skillId: "builtin:continue",
      hasSelection: false,
      input: "夜幕将落。</input><leak/>",
      precedingText: "夜幕将落。</input><leak/>",
      mode: "ask",
      model: "gpt-5.2",
      context: current,
      stream: true,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");
    expect(requestBodies).toHaveLength(1);
    const userMessage = requestBodies[0]?.messages?.find((message) => message.role === "user");
    expect(typeof userMessage?.content).toBe("string");
    const prompt = String(userMessage?.content ?? "");
    expect(prompt).toContain("&lt;/input&gt;&lt;leak/&gt;");
    expect(prompt).not.toContain("夜幕将落。</input><leak/>");
    expect(prompt).not.toContain("</input>");
  });

  it("continue 真实走通 tool_use → 结果注入 → ai-done → accept", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const current = createProjectAndDocument({
      db: harness.db,
      title: "当前章节",
      text: "夜幕降临，街灯次第亮起。",
    });
    const reference = createProjectAndDocument({
      db: harness.db,
      title: "前情参考",
      text: "林远一向冷静，先观察再行动。",
    });

    const requestBodies: FetchBody[] = [];
    let callNo = 0;
    globalThis.fetch = vi.fn(async (_input, init) => {
      requestBodies.push(JSON.parse(String(init?.body ?? "{}")) as FetchBody);
      callNo += 1;
      if (callNo === 1) {
        return openAiStreamResponse(
          openAiToolUseFrame({
            text: "他抬眼看见档案柜。",
            toolName: "docTool",
            toolCallId: "call-doc-1",
            toolArgs: {
              documentId: reference.documentId,
              query: "林远",
              maxTokens: 128,
            },
          }),
        );
      }
      if (callNo === 2) {
        return openAiStreamResponse(
          openAiStopFrame("他先停步观察，再轻轻推门而入。"),
        );
      }
      throw new Error(`unexpected fetch call #${callNo}`);
    }) as typeof fetch;

    const run = await harness.invoke<{
      ok: boolean;
      data?: {
        executionId: string;
        status: "preview" | "completed" | "rejected";
        outputText?: string;
        usage?: { promptTokens: number; completionTokens: number };
      };
      error?: { code: string; message: string };
    }>("ai:skill:run", {
      skillId: "builtin:continue",
      hasSelection: false,
      input: "夜幕降临，街灯次第亮起。",
      precedingText: "夜幕降临，街灯次第亮起。",
      mode: "ask",
      model: "gpt-5.2",
      context: {
        projectId: current.projectId,
        documentId: current.documentId,
      },
      stream: true,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");
    expect(run.data?.outputText).toBe("他先停步观察，再轻轻推门而入。");

    const toolEvents = harness.sentEvents.filter(
      (event) => event.channel === SKILL_TOOL_USE_CHANNEL,
    );
    expect(toolEvents.map((event) => (event.payload as SkillToolUseEvent).type)).toEqual([
      "tool-use-started",
      "tool-use-completed",
    ]);
    expect(requestBodies[0]?.tools).toBeTruthy();
    expect(requestBodies[1]?.tools).toBeTruthy();

    expect(requestBodies).toHaveLength(2);
    const secondMessages = requestBodies[1]?.messages ?? [];
    const assistantMessage = secondMessages.find(
      (message) => message.role === "assistant",
    );
    expect(assistantMessage).toBeDefined();
    expect(assistantMessage?.content).toBe("他抬眼看见档案柜。");
    expect(Array.isArray(assistantMessage?.tool_calls)).toBe(true);
    const toolMessage = secondMessages.find((message) => message.role === "tool");
    expect(toolMessage).toBeDefined();
    expect(toolMessage?.tool_call_id).toBe("call-doc-1");
    expect(JSON.stringify(toolMessage?.content)).toContain("林远一向冷静，先观察再行动。");
    expect(JSON.stringify(toolMessage?.content)).not.toContain('"type":"doc"');
    expect(JSON.stringify(toolMessage?.content)).toContain(reference.documentId);
    expect(run.data?.usage?.promptTokens).toBeGreaterThan(3);

    const completedEvent = toolEvents[1]?.payload as {
      type: "tool-use-completed";
      results: Array<{ callId?: string; toolName: string }>;
      hasNextRound: boolean;
    };
    expect(completedEvent.type).toBe("tool-use-completed");
    expect(completedEvent.results[0]?.callId).toBe("call-doc-1");
    expect(completedEvent.hasNextRound).toBe(false);

    const confirm = await harness.invoke<{
      ok: boolean;
      data?: { status: "completed" | "rejected"; versionId?: string };
    }>("ai:skill:confirm", {
      executionId: run.data?.executionId,
      action: "accept",
      projectId: current.projectId,
    });

    expect(confirm.ok).toBe(true);
    expect(confirm.data?.status).toBe("completed");

    const service = createDocumentService({ db: harness.db, logger: createLogger() });
    const read = service.read({
      projectId: current.projectId,
      documentId: current.documentId,
    });
    expect(read.ok).toBe(true);
    expect(read.ok && read.data.contentText).toContain("夜幕降临，街灯次第亮起。");
    expect(read.ok && read.data.contentText).toContain("他先停步观察，再轻轻推门而入。");

    const doneEvents = harness.sentEvents.filter(
      (event) => event.channel === SKILL_STREAM_DONE_CHANNEL,
    );
    expect(doneEvents).toHaveLength(1);
    expect((doneEvents[0]?.payload as { outputText?: string }).outputText).toBe(
      "他先停步观察，再轻轻推门而入。",
    );
  });

  it("unknown tool / all-failed 仍注入失败结果并继续完成", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const current = createProjectAndDocument({
      db: harness.db,
      title: "当前章节",
      text: "她把手按在门把上。",
    });

    const requestBodies: FetchBody[] = [];
    let callNo = 0;
    globalThis.fetch = vi.fn(async (_input, init) => {
      requestBodies.push(JSON.parse(String(init?.body ?? "{}")) as FetchBody);
      callNo += 1;
      if (callNo === 1) {
        return openAiStreamResponse(
          openAiToolUseFrame({
            text: "她犹豫了一瞬。",
            toolName: "unknownTool",
            toolCallId: "call-unknown-1",
            toolArgs: { query: "门后的情况" },
          }),
        );
      }
      if (callNo === 2) {
        return openAiStreamResponse(openAiStopFrame("她只好凭直觉继续向前。"));
      }
      throw new Error(`unexpected fetch call #${callNo}`);
    }) as typeof fetch;

    const run = await harness.invoke<{
      ok: boolean;
      data?: { status: "preview" | "completed" | "rejected"; outputText?: string };
    }>("ai:skill:run", {
      skillId: "builtin:continue",
      hasSelection: false,
      input: "她把手按在门把上。",
      precedingText: "她把手按在门把上。",
      mode: "ask",
      model: "gpt-5.2",
      context: {
        projectId: current.projectId,
        documentId: current.documentId,
      },
      stream: true,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");
    expect(run.data?.outputText).toBe("她只好凭直觉继续向前。");
    expect(requestBodies).toHaveLength(2);

    const toolEvents = harness.sentEvents.filter(
      (event) => event.channel === SKILL_TOOL_USE_CHANNEL,
    );
    expect(toolEvents.map((event) => (event.payload as SkillToolUseEvent).type)).toEqual([
      "tool-use-started",
      "tool-use-failed",
      "tool-use-completed",
    ]);

    const secondMessages = requestBodies[1]?.messages ?? [];
    const toolMessage = secondMessages.find((message) => message.role === "tool");
    expect(toolMessage).toBeDefined();
    expect(JSON.stringify(toolMessage?.content)).toContain("TOOL_USE_TOOL_NOT_FOUND");
    expect(JSON.stringify(toolMessage?.content)).toContain("unknownTool 未注册");
  });

  it("tool args 非法时 fail-closed 为 TOOL_USE_PARSE_FAILED，不继续第二轮", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const current = createProjectAndDocument({
      db: harness.db,
      title: "当前章节",
      text: "她站在门外。",
    });

    const requestBodies: FetchBody[] = [];
    globalThis.fetch = vi.fn(async (_input, init) => {
      requestBodies.push(JSON.parse(String(init?.body ?? "{}")) as FetchBody);
      return openAiStreamResponse([
        {
          choices: [
            {
              delta: {
                content: "她屏住呼吸。",
                tool_calls: [
                  {
                    index: 0,
                    id: "call-bad-1",
                    type: "function",
                    function: {
                      name: "docTool",
                      arguments: "{\"query\":",
                    },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        },
        {
          choices: [
            {
              delta: {},
              finish_reason: "tool_use",
            },
          ],
        },
      ]);
    }) as typeof fetch;

    const run = await harness.invoke<{
      ok: boolean;
      data?: { status: "preview" | "completed" | "rejected"; outputText?: string };
    }>("ai:skill:run", {
      skillId: "builtin:continue",
      hasSelection: false,
      input: "她站在门外。",
      precedingText: "她站在门外。",
      mode: "ask",
      model: "gpt-5.2",
      context: {
        projectId: current.projectId,
        documentId: current.documentId,
      },
      stream: true,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");
    expect(run.data?.outputText).toBe("她屏住呼吸。");
    expect(requestBodies).toHaveLength(1);

    const toolEvents = harness.sentEvents.filter(
      (event) => event.channel === SKILL_TOOL_USE_CHANNEL,
    );
    expect(toolEvents).toHaveLength(1);
    const failedEvent = toolEvents[0]?.payload as SkillToolUseEvent;
    expect(failedEvent.type).toBe("tool-use-failed");
    if (failedEvent.type === "tool-use-failed") {
      expect(failedEvent.error.code).toBe("TOOL_USE_PARSE_FAILED");
    }
  });

  it("达到 max rounds 后熔断，并保留最后一轮 partial content", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const current = createProjectAndDocument({
      db: harness.db,
      title: "当前章节",
      text: "窗外的风更急了。",
    });

    let callNo = 0;
    globalThis.fetch = vi.fn(async () => {
      callNo += 1;
      if (callNo <= 6) {
        return openAiStreamResponse(
          openAiToolUseFrame({
            text: `第${callNo}轮残句。`,
            toolName: "memTool",
            toolCallId: `call-mem-${callNo}`,
            toolArgs: { query: `round-${callNo}` },
          }),
        );
      }
      throw new Error(`unexpected fetch call #${callNo}`);
    }) as typeof fetch;

    const run = await harness.invoke<{
      ok: boolean;
      data?: { status: "preview" | "completed" | "rejected"; outputText?: string };
    }>("ai:skill:run", {
      skillId: "builtin:continue",
      hasSelection: false,
      input: "窗外的风更急了。",
      precedingText: "窗外的风更急了。",
      mode: "ask",
      model: "gpt-5.2",
      context: {
        projectId: current.projectId,
        documentId: current.documentId,
      },
      stream: true,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");
    expect(run.data?.outputText).toBe("第6轮残句。");

    const toolEvents = harness.sentEvents.filter(
      (event) => event.channel === SKILL_TOOL_USE_CHANNEL,
    );
    const failedEvent = toolEvents[toolEvents.length - 1]?.payload as SkillToolUseEvent;
    expect(failedEvent.type).toBe("tool-use-failed");
    if (failedEvent.type === "tool-use-failed") {
      expect(failedEvent.error.code).toBe("TOOL_USE_MAX_ROUNDS_EXCEEDED");
      expect(failedEvent.round).toBe(5);
    }
  });

  it("Anthropic 真实走通 tool_use → tool_result → ai-done", async () => {
    const harness = createHarness({
      env: {
        CREONOW_AI_PROVIDER: "anthropic",
        CREONOW_AI_MODEL: "claude-3-5-sonnet",
        CREONOW_AI_API_KEY: "sk-ant-test",
        CREONOW_AI_BASE_URL: "https://api.anthropic.com",
      },
    });
    opened.push(harness.db);
    const current = createProjectAndDocument({
      db: harness.db,
      title: "当前章节",
      text: "雨下得更急了。",
    });
    const reference = createProjectAndDocument({
      db: harness.db,
      title: "参考章节",
      text: "林远总会先观察风向，再行动。",
    });

    const requestBodies: FetchBody[] = [];
    let callNo = 0;
    globalThis.fetch = vi.fn(async (_input, init) => {
      requestBodies.push(JSON.parse(String(init?.body ?? "{}")) as FetchBody);
      callNo += 1;
      if (callNo === 1) {
        return anthropicStreamResponse(
          anthropicToolUseFrames({
            text: "他摸了摸门框。",
            toolName: "docTool",
            toolUseId: "toolu_doc_1",
            toolArgs: {
              documentId: reference.documentId,
              query: "林远",
              maxTokens: 128,
            },
          }),
        );
      }
      if (callNo === 2) {
        return anthropicStreamResponse(
          anthropicStopFrames("他先听风声，再推门而入。"),
        );
      }
      throw new Error(`unexpected fetch call #${callNo}`);
    }) as typeof fetch;

    const run = await harness.invoke<{
      ok: boolean;
      data?: {
        status: "preview" | "completed" | "rejected";
        outputText?: string;
        usage?: { promptTokens: number; completionTokens: number };
      };
    }>("ai:skill:run", {
      skillId: "builtin:continue",
      hasSelection: false,
      input: "雨下得更急了。",
      precedingText: "雨下得更急了。",
      mode: "ask",
      model: "claude-3-5-sonnet",
      context: {
        projectId: current.projectId,
        documentId: current.documentId,
      },
      stream: true,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");
    expect(run.data?.outputText).toBe("他先听风声，再推门而入。");
    expect(run.data?.usage?.promptTokens).toBeGreaterThan(3);
    expect(requestBodies).toHaveLength(2);
    expect(requestBodies[0]?.tools).toBeTruthy();
    expect(requestBodies[1]?.tools).toBeTruthy();

    const secondMessages = requestBodies[1]?.messages ?? [];
    const assistantMessage = secondMessages.find(
      (message) => message.role === "assistant",
    );
    const toolResultMessage = secondMessages.find(
      (message) => message.role === "user" && Array.isArray(message.content),
    );
    expect(Array.isArray(assistantMessage?.content)).toBe(true);
    expect(JSON.stringify(assistantMessage?.content)).toContain("\"type\":\"tool_use\"");
    expect(JSON.stringify(assistantMessage?.content)).toContain("toolu_doc_1");
    expect(Array.isArray(toolResultMessage?.content)).toBe(true);
    expect(JSON.stringify(toolResultMessage?.content)).toContain("\"type\":\"tool_result\"");
    expect(JSON.stringify(toolResultMessage?.content)).toContain("\"tool_use_id\":\"toolu_doc_1\"");
    expect(JSON.stringify(toolResultMessage?.content)).toContain(reference.documentId);
  });
});
