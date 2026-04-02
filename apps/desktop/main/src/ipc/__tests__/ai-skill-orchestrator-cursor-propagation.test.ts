import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import type { IpcMain } from "electron";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { assembleSpy } = vi.hoisted(() => ({
  assembleSpy: vi.fn(),
}));

vi.mock("../../services/context/layerAssemblyService", () => ({
  createContextLayerAssemblyService: () => ({
    assemble: assembleSpy,
    inspect: vi.fn(),
    getBudgetProfile: () => ({
      version: 1,
      tokenizerId: "test-tokenizer",
      tokenizerVersion: "1.0.0",
      totalBudgetTokens: 1_000,
      layers: {
        rules: { ratio: 0.25, minimumTokens: 0 },
        settings: { ratio: 0.25, minimumTokens: 0 },
        retrieved: { ratio: 0.25, minimumTokens: 0 },
        immediate: { ratio: 0.25, minimumTokens: 0 },
      },
    }),
    updateBudgetProfile: vi.fn(),
  }),
}));

import type { Logger } from "../../logging/logger";
import { createDocumentService } from "../../services/documents/documentService";
import { registerAiIpcHandlers } from "../ai";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../db/migrations",
);

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
  text: string;
}): { projectId: string; documentId: string } {
  const projectId = "proj-cursor-propagation";
  args.db
    .prepare(
      "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(projectId, "测试项目", "/worktree/test-root", Date.now(), Date.now());

  const service = createDocumentService({ db: args.db, logger: createLogger() });
  const created = service.create({
    projectId,
    title: "第一章",
    type: "chapter",
  });
  if (!created.ok) {
    throw new Error(created.error.message);
  }

  const saved = service.save({
    projectId,
    documentId: created.data.documentId,
    actor: "user",
    reason: "manual-save",
    contentJson: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: args.text }],
        },
      ],
    },
  });
  if (!saved.ok) {
    throw new Error(saved.error.message);
  }

  return {
    projectId,
    documentId: created.data.documentId,
  };
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
      CREONOW_E2E: "1",
      CREONOW_AI_PROVIDER: "openai",
      CREONOW_AI_MODEL: "gpt-5.2",
    },
  });

  const sender = {
    id: 1,
    send: () => {},
  };

  return {
    db,
    async invoke<T>(channel: string, payload: unknown): Promise<T> {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`Missing handler: ${channel}`);
      }
      return (await handler({ sender }, payload)) as T;
    },
  };
}

function makeAssembleResult(prompt: string) {
  return {
    prompt,
    tokenCount: 12,
    stablePrefixHash: "hash-test",
    stablePrefixUnchanged: false,
    warnings: [],
    assemblyOrder: ["rules", "settings", "retrieved", "immediate"] as const,
    layers: {
      rules: { source: [], tokenCount: 0, truncated: false },
      settings: { source: [], tokenCount: 0, truncated: false },
      retrieved: { source: [], tokenCount: 0, truncated: false },
      immediate: {
        source: ["editor:cursor-window"],
        tokenCount: 1,
        truncated: false,
      },
    },
  };
}

describe("ai:skill:run cursor propagation regression", () => {
  const opened: Database.Database[] = [];

  beforeEach(() => {
    assembleSpy.mockReset();
    assembleSpy.mockResolvedValue(
      makeAssembleResult("## Immediate\ncursor=3"),
    );
  });

  afterEach(() => {
    for (const db of opened.splice(0)) {
      db.close();
    }
    vi.restoreAllMocks();
  });

  it("builtin:continue 显式 cursorPosition 会同时透传给 prepareRequest 与 skillExecutor 的 context assembly", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "甲乙丙丁",
    });

    const run = await harness.invoke<{
      ok: boolean;
      data?: { status: "preview" | "completed" | "rejected" };
      error?: { code: string; message: string };
    }>("ai:skill:run", {
      skillId: "builtin:continue",
      hasSelection: false,
      cursorPosition: 3,
      input: "甲乙丙丁",
      mode: "ask",
      model: "gpt-5.2",
      context: { projectId, documentId },
      stream: false,
    });

    expect(run.ok).toBe(true);
    expect(run.data?.status).toBe("preview");
    expect(assembleSpy).toHaveBeenCalledTimes(2);
    expect(assembleSpy.mock.calls.map(([request]) => request.cursorPosition)).toEqual([
      3,
      3,
    ]);
    expect(assembleSpy.mock.calls).toEqual([
      [
        expect.objectContaining({
          projectId,
          documentId,
          cursorPosition: 3,
          skillId: "builtin:continue",
          additionalInput: "甲乙丙丁",
          provider: "ai-service",
          model: "gpt-5.2",
        }),
      ],
      [
        expect.objectContaining({
          projectId,
          documentId,
          cursorPosition: 3,
          skillId: "builtin:continue",
          additionalInput: "甲乙丙丁",
          provider: "ai-service",
          model: "gpt-5.2",
        }),
      ],
    ]);
  });
});
