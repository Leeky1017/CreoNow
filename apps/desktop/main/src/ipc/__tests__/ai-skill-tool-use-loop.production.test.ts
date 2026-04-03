import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAiService } from "../../services/ai/aiService";
import { createWritingOrchestrator } from "../../services/skills/orchestrator";
import { createSkillExecutor } from "../../services/skills/skillExecutor";
import { createToolUseHandler } from "../../services/skills/toolUseHandler";
import { createWritingToolRegistry, createAgenticToolRegistry } from "../../services/skills/writingTooling";
import { createDocumentService } from "../../services/documents/documentService";
import type { Logger } from "../../logging/logger";

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../db/migrations",
);

function createLogger(): Logger {
  return { logPath: "<test>", info: () => {}, error: () => {} };
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

function createProjectAndDocument(args: { db: Database.Database; text: string }) {
  const projectId = "proj-1";
  args.db
    .prepare(
      "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(projectId, "测试项目", "/worktree/test-root", Date.now(), Date.now());

  const service = createDocumentService({ db: args.db, logger: createLogger() });
  const created = service.create({ projectId, title: "第一章", type: "chapter" });
  if (!created.ok) {
    throw new Error(created.error.message);
  }
  const saved = service.save({
    projectId,
    documentId: created.data.documentId,
    contentJson: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: args.text }] }],
    },
    actor: "user",
    reason: "manual-save",
  });
  if (!saved.ok) {
    throw new Error(saved.error.message);
  }
  return { projectId, documentId: created.data.documentId };
}

describe("production continue tool-use loop", () => {
  const opened: Database.Database[] = [];
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    for (const db of opened.splice(0)) {
      db.close();
    }
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("continue 走通 real skillExecutor → aiService → tool result injection → ai-done", async () => {
    const db = new Database(":memory:");
    opened.push(db);
    db.pragma("foreign_keys = ON");
    applyAllMigrations(db);
    const { projectId, documentId } = createProjectAndDocument({
      db,
      text: "夜幕降临，街灯次第亮起。",
    });

    const requestBodies: Array<Record<string, unknown>> = [];
    let callNo = 0;
    globalThis.fetch = vi.fn(async (_input, init) => {
      callNo += 1;
      const rawBody = typeof init?.body === "string" ? init.body : "{}";
      requestBodies.push(JSON.parse(rawBody) as Record<string, unknown>);
      if (callNo === 1) {
        return new Response(
          [
            `data: ${JSON.stringify({ choices: [{ delta: { content: "先看角色设定。" } }] })}`,
            `data: ${JSON.stringify({
              choices: [{
                delta: {
                  tool_calls: [{
                    id: "call-kg-1",
                    type: "function",
                    function: {
                      name: "kgTool",
                      arguments: { query: "林远的性格特点" },
                    },
                  }],
                },
              }],
            })}`,
            `data: ${JSON.stringify({ choices: [{ finish_reason: "tool_calls" }] })}`,
            "data: [DONE]",
            "",
          ].join("\n\n"),
          { status: 200, headers: { "content-type": "text/event-stream" } },
        );
      }
      return new Response(
        [
          `data: ${JSON.stringify({ choices: [{ delta: { content: "林远缓步推门，神色冷静。" } }] })}`,
          `data: ${JSON.stringify({ choices: [{ finish_reason: "stop" }] })}`,
          "data: [DONE]",
          "",
        ].join("\n\n"),
        { status: 200, headers: { "content-type": "text/event-stream" } },
      );
    }) as typeof fetch;

    const aiService = createAiService({
      logger: createLogger(),
      env: {
        CREONOW_AI_PROVIDER: "openai",
        CREONOW_AI_BASE_URL: "https://api.openai.test",
        CREONOW_AI_API_KEY: "sk-test",
        CREONOW_AI_MODEL: "gpt-5.2",
      },
      sleep: async () => {},
      rateLimitPerMinute: 1000,
    });

    const skillExecutor = createSkillExecutor({
      resolveSkill: () => ({
        ok: true,
        data: {
          id: "builtin:continue",
          prompt: {
            system:
              "You are CreoNow's writing assistant. Continue writing from provided context, matching style and narrative constraints.",
            user: "Continue the draft based on current context and constraints.\n\n<text>\n{{input}}\n</text>",
          },
          enabled: true,
          valid: true,
          inputType: "document",
        },
      }),
      runSkill: aiService.runSkill,
    });

    const permissionGate = {
      evaluate: vi.fn().mockResolvedValue({ level: "auto-allow", granted: true }),
      requestPermission: vi.fn().mockResolvedValue(true),
      releasePendingPermission: vi.fn(),
    };

    const orchestrator = createWritingOrchestrator({
      aiService: { async *streamChat() { return; }, estimateTokens: (text) => text.length, abort: vi.fn() },
      toolRegistry: createWritingToolRegistry({ db, logger: createLogger() }),
      toolUseHandler: createToolUseHandler(createAgenticToolRegistry({ db, logger: createLogger() }), {
        maxToolRounds: 5,
        toolTimeoutMs: 10_000,
        maxConcurrentTools: 4,
        agenticLoop: true,
      }),
      permissionGate,
      postWritingHooks: [],
      defaultTimeoutMs: 30_000,
      prepareRequest: async () => ({
        messages: [
          {
            role: "system",
            content:
              "You are CreoNow's writing assistant. Continue writing from provided context, matching style and narrative constraints.",
          },
          {
            role: "user",
            content: "Continue the draft based on current context and constraints.\n\n<text>\n夜幕降临，街灯次第亮起。\n</text>",
          },
        ],
        tokenCount: 10,
        modelId: "gpt-5.2",
      }),
      generateText: async ({ request, signal, emitChunk, messages }) => {
        let outputText = "";
        let finishReason: "stop" | "tool_use" | null = null;
        let toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> = [];
        const res = await skillExecutor.execute({
          skillId: request.skillId,
          input: request.input.precedingText ?? "",
          mode: "ask",
          model: "gpt-5.2",
          context: { projectId: request.projectId, documentId: request.documentId },
          ...(messages ? { messages } : {}),
          stream: true,
          ts: Date.now(),
          emitEvent: (event) => {
            if (signal.aborted) {
              return;
            }
            if (event.type === "chunk") {
              outputText += event.chunk;
              emitChunk(event.chunk, Number((event as { accumulatedTokens?: unknown }).accumulatedTokens ?? 0));
              return;
            }
            if (event.type === "done") {
              outputText = event.outputText;
              finishReason = event.finishReason ?? null;
              toolCalls = event.toolCalls ?? [];
            }
          },
        });
        if (!res.ok) {
          throw res.error;
        }
        return {
          fullText: outputText || res.data.outputText || "",
          usage: { promptTokens: 10, completionTokens: outputText.length, totalTokens: 10 + outputText.length },
          finishReason: finishReason ?? res.data.finishReason ?? null,
          toolCalls: toolCalls.length > 0 ? toolCalls : (res.data.toolCalls ?? []),
        };
      },
    });

    const events = [] as Array<{ type: string; [key: string]: unknown }>;
    for await (const event of orchestrator.execute({
      requestId: "req-continue-1",
      skillId: "builtin:continue",
      input: { precedingText: "夜幕降临，街灯次第亮起。" },
      documentId,
      projectId,
      cursorPosition: 10,
      agenticLoop: true,
    })) {
      events.push(event as { type: string; [key: string]: unknown });
    }

    expect(callNo).toBe(2);
    expect(events.map((event) => event.type)).toContain("tool-use-started");
    expect(events.map((event) => event.type)).toContain("tool-use-completed");
    expect(events.find((event) => event.type === "ai-done")?.fullText).toBe(
      "林远缓步推门，神色冷静。",
    );

    const secondBody = requestBodies[1];
    const messages = Array.isArray(secondBody.messages)
      ? (secondBody.messages as Array<{ role?: string; content?: string }>)
      : [];
    const toolMessage = messages.find((message) => message.role === "tool");
    expect(toolMessage?.content).toContain("query");
    expect(toolMessage?.content).toContain("林远的性格特点");
  });
});
