import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import type { IpcMain } from "electron";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Logger } from "../../logging/logger";
import { createCostTracker } from "../../services/ai/costTracker";
import { estimateTokens } from "../../services/context/tokenEstimation";
import { createDocumentService } from "../../services/documents/documentService";
import { registerAiIpcHandlers } from "../ai";
import { registerCostIpcHandlers } from "../cost";
import { registerVersionIpcHandlers } from "../version";

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../db/migrations",
);

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

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

function createProjectAndDocument(args: {
  db: Database.Database;
  title: string;
  text: string;
}) {
  const projectId = "proj-cost";
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

  return { projectId, documentId: created.data.documentId };
}

function openAiStopResponse(text: string): Response {
  const frames = [
    {
      choices: [
        {
          delta: { content: text },
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
  return new Response(
    `${frames.map((frame) => `data: ${JSON.stringify(frame)}\n\n`).join("")}data: [DONE]\n\n`,
    {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    },
  );
}

function createHarness() {
  const handlers = new Map<string, Handler>();
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  applyAllMigrations(db);

  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  const tracker = createCostTracker({
    pricingTable: {
      currency: "USD",
      lastUpdated: "2025-01-01T00:00:00.000Z",
      prices: {
        "gpt-5.2": {
          modelId: "gpt-5.2",
          displayName: "GPT-5.2",
          inputPricePer1K: 0.0015,
          outputPricePer1K: 0.003,
          effectiveDate: "2025-01-01",
        },
      },
    },
    budgetPolicy: {
      warningThreshold: 1,
      hardStopLimit: 5,
      enabled: true,
    },
    estimateTokens,
  });

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
    costTracker: tracker,
  });
  registerVersionIpcHandlers({
    ipcMain,
    db,
    logger: createLogger(),
  });
  registerCostIpcHandlers({
    ipcMain,
    tracker,
    logger: createLogger(),
  });

  return {
    db,
    async invoke<T>(channel: string, payload: unknown): Promise<T> {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`Missing handler: ${channel}`);
      }
      return (await handler(
        { sender: { id: 1, send: vi.fn() } },
        payload,
      )) as T;
    },
  };
}

describe("ai skill cost tracking integration", () => {
  const opened: Database.Database[] = [];
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    for (const db of opened.splice(0)) {
      db.close();
    }
  });

  it("真实 ai:skill:run 后 cost:usage:* 可读取到费用数据", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const current = createProjectAndDocument({
      db: harness.db,
      title: "当前章节",
      text: "夜幕降临，街灯次第亮起。",
    });

    globalThis.fetch = vi.fn(async () =>
      openAiStopResponse("他先停步观察，再轻轻推门而入。"),
    ) as typeof fetch;

    const run = await harness.invoke<{
      ok: boolean;
      data?: { status: "preview" | "completed" | "rejected" };
    }>("ai:skill:run", {
      skillId: "builtin:continue",
      hasSelection: false,
      input: "夜幕降临，街灯次第亮起。",
      precedingText: "夜幕降临，街灯次第亮起。",
      mode: "ask",
      model: "gpt-5.2",
      context: current,
      stream: true,
    });

    expect(run.ok).toBe(true);

    const summary = await harness.invoke<{
      ok: boolean;
      data: { totalRequests: number; totalCost: number };
    }>("cost:usage:summary", undefined);
    const list = await harness.invoke<{
      ok: boolean;
      data: { totalCount: number; records: Array<{ modelId: string }> };
    }>("cost:usage:list", undefined);

    expect(summary.ok).toBe(true);
    expect(summary.data.totalRequests).toBe(1);
    expect(summary.data.totalCost).toBeGreaterThan(0);
    expect(list.ok).toBe(true);
    expect(list.data.totalCount).toBe(1);
    expect(list.data.records[0]).toMatchObject({ modelId: "gpt-5.2" });
  });
});
