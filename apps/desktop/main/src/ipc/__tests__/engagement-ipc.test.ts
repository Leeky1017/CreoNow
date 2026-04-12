import { describe, expect, it, vi } from "vitest";
import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import { registerEngagementIpcHandlers } from "../engagement";
import { createProjectSessionBindingRegistry } from "../projectSessionBinding";

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

function createLogger() {
  return {
    logPath: "<test>",
    info: vi.fn(),
    error: vi.fn(),
  };
}

function createDbStub(): Database.Database {
  return {
    prepare: (sql: string) => {
      if (sql.includes("COUNT(*)") && sql.includes("MAX(updated_at)")) {
        return { get: () => ({ chapterCount: 1, maxUpdatedAt: 1000 }) };
      }
      if (sql.includes("FROM documents") && sql.includes("type = 'chapter'")) {
        return {
          all: () => [
            {
              documentId: "doc-1",
              title: "第一章",
              sortOrder: 1,
              updatedAt: 1000,
              status: "draft",
            },
          ],
        };
      }
      if (sql.includes("FROM kg_entities")) {
        return { all: () => [] };
      }
      return { get: () => undefined, all: () => [] };
    },
  } as unknown as Database.Database;
}

function createHarness(args?: {
  db?: Database.Database | null;
  withProjectBinding?: boolean;
}) {
  const handlers = new Map<string, Handler>();
  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  const projectSessionBinding = args?.withProjectBinding
    ? createProjectSessionBindingRegistry()
    : undefined;
  if (projectSessionBinding) {
    projectSessionBinding.bind({ webContentsId: 101, projectId: "proj-1" });
  }

  registerEngagementIpcHandlers({
    ipcMain,
    db: args?.db === undefined ? createDbStub() : args.db,
    logger: createLogger() as never,
    projectSessionBinding,
  });

  return {
    async invoke(channel: string, payload?: unknown, eventId = 101) {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return handler({ sender: { id: eventId } }, payload) as Promise<{
        ok: boolean;
        data?: unknown;
        error?: { code: string; message: string };
      }>;
    },
  };
}

describe("engagement IPC handler", () => {
  it("valid request returns story status", async () => {
    const harness = createHarness();
    const result = await harness.invoke("engagement:storystatus:get", {
      projectId: "proj-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      chapterProgress: { totalChapters: 1, currentChapterNumber: 1 },
      suggestedAction: "继续写作",
    });
  });

  it("missing projectId returns INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const result = await harness.invoke("engagement:storystatus:get", {});

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("db not ready returns DB_ERROR", async () => {
    const harness = createHarness({ db: null });
    const result = await harness.invoke("engagement:storystatus:get", {
      projectId: "proj-1",
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("DB_ERROR");
    expect(result.error?.message).toBe("Database not ready");
  });

  it("project binding mismatch returns FORBIDDEN", async () => {
    const harness = createHarness({ withProjectBinding: true });
    const result = await harness.invoke("engagement:storystatus:get", {
      projectId: "proj-2",
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("FORBIDDEN");
  });
});
