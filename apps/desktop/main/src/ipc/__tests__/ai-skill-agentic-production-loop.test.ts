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
  messages?: Array<{ role?: string; content?: unknown; tool_call_id?: string }>;
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

function createHarness() {
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

    expect(requestBodies).toHaveLength(2);
    const secondMessages = requestBodies[1]?.messages ?? [];
    expect(secondMessages.some((message) => message.role === "assistant" && message.content === "他抬眼看见档案柜。"))
      .toBe(true);
    const toolMessage = secondMessages.find((message) => message.role === "tool");
    expect(toolMessage).toBeDefined();
    expect(JSON.stringify(toolMessage?.content)).toContain("林远一向冷静，先观察再行动。");
    expect(JSON.stringify(toolMessage?.content)).not.toContain('"type":"doc"');
    expect(JSON.stringify(toolMessage?.content)).toContain(reference.documentId);

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
});
