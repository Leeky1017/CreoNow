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
  contentJson?: unknown;
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
    contentJson:
      args.contentJson ?? {
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
      agenticLoop: true,
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

  // RED TEST: IPC must convert PM pos to text offset and pass textOffset to context assembly.
  // For document "甲乙丙丁" (single paragraph), PM pos 3 = after 乙 = text offset 2.
  // This ensures the immediate layer slices "甲乙" (not "甲乙丙") for cursorPosition=3.
  it("builtin:continue IPC 层把 PM pos 转换为 textOffset 并传给 context assembly", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "甲乙丙丁",
    });

    await harness.invoke("ai:skill:run", {
      skillId: "builtin:continue",
      hasSelection: false,
      cursorPosition: 3,
      input: "甲乙丙丁",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
      context: { projectId, documentId },
      stream: false,
    });

    // PM pos 3 in single-para doc "甲乙丙丁" → text offset 2 (after 乙)
    // Both calls (prepareRequest + skillExecutor) must receive textOffset=2
    expect(assembleSpy.mock.calls.map(([request]) => request.textOffset)).toEqual([2, 2]);
  });

  it("builtin:continue 保留 leading whitespace 的 anchor：PM pos 4 → textOffset 3", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: " 甲乙 ",
    });

    await harness.invoke("ai:skill:run", {
      skillId: "builtin:continue",
      hasSelection: false,
      cursorPosition: 4,
      input: " 甲乙 ",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
      context: { projectId, documentId },
      stream: false,
    });

    expect(assembleSpy.mock.calls.map(([request]) => request.textOffset)).toEqual([3, 3]);
  });

  it("builtin:continue 跨段落时会把 deriveContent 的换行计入 textOffset", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const contentJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "甲" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "乙丙" }],
        },
      ],
    };
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "甲\n乙丙",
      contentJson,
    });

    await harness.invoke("ai:skill:run", {
      skillId: "builtin:continue",
      hasSelection: false,
      cursorPosition: 5,
      input: "甲\n乙丙",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
      context: { projectId, documentId },
      stream: false,
    });

    expect(assembleSpy.mock.calls.map(([request]) => request.textOffset)).toEqual([3, 3]);
  });

  // RED→GREEN regression: Audit-B BLOCKING FINDING — selection skills (polish/rewrite) must
  // pass additionalInputIsSelection=true so the immediate layer does NOT slice selection text.
  it("builtin:polish 的 context assembly 请求必须携带 additionalInputIsSelection=true", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "First paragraph\nSecond paragraph",
    });

    const selectionText = "First paragraph\nSecond paragraph";
    await harness.invoke("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      input: selectionText,
      selection: {
        from: 1,
        to: 35,
        text: selectionText,
        selectionTextHash: "abc123",
      },
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
      context: { projectId, documentId },
      stream: false,
    });

    // Both assemble calls must carry additionalInputIsSelection=true
    const flags = assembleSpy.mock.calls.map(([request]) => request.additionalInputIsSelection);
    expect(flags.every((f: unknown) => f === true)).toBe(true);
    // textOffset may still be set but the immediate layer guard ensures it is ignored
  });

  it("builtin:continue の context assembly 请求 additionalInputIsSelection 为 false 或 undefined", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "甲乙丙丁",
    });

    await harness.invoke("ai:skill:run", {
      skillId: "builtin:continue",
      hasSelection: false,
      cursorPosition: 3,
      input: "甲乙丙丁",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
      context: { projectId, documentId },
      stream: false,
    });

    // Document-window skill: additionalInputIsSelection must be false (not true)
    const flags = assembleSpy.mock.calls.map(([request]) => request.additionalInputIsSelection);
    expect(flags.every((f: unknown) => f !== true)).toBe(true);
  });

  // RED TEST: P1 input-bridge blocker — when the IPC payload carries an explicit
  // `precedingText` field (document-window semantic), both assemble() calls must
  // receive that text as additionalInput instead of falling back to an empty string.
  it("builtin:continue precedingText 通过 IPC payload 传入时，两路 assemble 均收到 precedingText 作为 additionalInput", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "夜幕降临，街灯次第亮起。",
    });

    await harness.invoke("ai:skill:run", {
      skillId: "builtin:continue",
      hasSelection: false,
      cursorPosition: 5,
      input: "",
      precedingText: "夜幕降临，街灯次第亮起。",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
      context: { projectId, documentId },
      stream: false,
    });

    // Both prepareRequest and generateText/skillExecutor assemble calls must use precedingText
    expect(assembleSpy).toHaveBeenCalledTimes(2);
    const additionalInputs = assembleSpy.mock.calls.map((args: unknown[]) => (args[0] as { additionalInput: unknown }).additionalInput);
    expect(additionalInputs).toEqual([
      "夜幕降临，街灯次第亮起。",
      "夜幕降临，街灯次第亮起。",
    ]);
  });

  // RED TEST: selection skills must NOT pick up precedingText — their input stays in `input`.
  it("builtin:polish 存在 precedingText 字段时，additionalInput 仍然取自 input 字段", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "First paragraph",
    });

    const selectionText = "First paragraph";
    await harness.invoke("ai:skill:run", {
      skillId: "builtin:polish",
      hasSelection: true,
      input: selectionText,
      precedingText: "should-be-ignored",
      selection: {
        from: 1,
        to: 16,
        text: selectionText,
        selectionTextHash: "abc123",
      },
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
      context: { projectId, documentId },
      stream: false,
    });

    // Selection skill: additionalInput must come from `input`, not `precedingText`
    expect(assembleSpy).toHaveBeenCalledTimes(2);
    const additionalInputs = assembleSpy.mock.calls.map((args: unknown[]) => (args[0] as { additionalInput: unknown }).additionalInput);
    expect(additionalInputs.every((ai: unknown) => ai === selectionText)).toBe(true);
  });

  // RED TEST: WritingRequest.input.precedingText bridge — when the orchestrator is given
  // a WritingRequest that already carries precedingText (and no selectedText), the
  // prepareRequest and generateText callbacks must not discard it by returning "".
  it("builtin:continue IPC payload precedingText 非空、input 为空时 assembleContext 不得收到空 additionalInput", async () => {
    const harness = createHarness();
    opened.push(harness.db);
    const { projectId, documentId } = createProjectAndDocument({
      db: harness.db,
      text: "她笑了笑，转身离去。",
    });

    await harness.invoke("ai:skill:run", {
      skillId: "builtin:continue",
      hasSelection: false,
      cursorPosition: 3,
      input: "",
      precedingText: "她笑了笑，转身离去。",
      mode: "ask",
      model: "gpt-5.2",
      agenticLoop: true,
      context: { projectId, documentId },
      stream: false,
    });

    expect(assembleSpy).toHaveBeenCalledTimes(2);
    // Neither call may receive empty-string additionalInput when precedingText is non-empty
    const additionalInputs = assembleSpy.mock.calls.map((args: unknown[]) => (args[0] as { additionalInput: unknown }).additionalInput);
    expect(additionalInputs.every((ai: unknown) => typeof ai === "string" && ai.length > 0)).toBe(true);
  });
});
