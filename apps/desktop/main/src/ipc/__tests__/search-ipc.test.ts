import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IpcMain } from "electron";

import {
  registerSearchIpcHandlers,
  resetSearchLifecycleScopeForTests,
} from "../search";
import { createProjectSessionBindingRegistry } from "../projectSessionBinding";
import {
  registerP3LifecycleParticipants,
  resetP3LifecycleParticipantsForTests,
} from "../../services/projects/p3LifecycleParticipants";

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

function createHarness() {
  const handlers = new Map<string, Handler>();
  const projectSessionBinding = createProjectSessionBindingRegistry();

  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  registerSearchIpcHandlers({
    ipcMain,
    db: {
      prepare: vi.fn(() => ({
        all: vi.fn(() => []),
        get: vi.fn(() => ({ total: 0 })),
        run: vi.fn(() => ({ changes: 0 })),
      })),
      exec: vi.fn(),
      transaction: vi.fn((fn: () => void) => fn),
    } as never,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as never,
    projectSessionBinding,
  });

  const register = vi.fn();
  registerP3LifecycleParticipants({
    register,
    bindAll: vi.fn(),
    unbindAll: vi.fn(),
    switchProject: vi.fn(),
  });
  const participants = new Map(
    register.mock.calls.map(([participant]) => [participant.id, participant]),
  );

  return {
    handlers,
    projectSessionBinding,
    participants,
    invoke: async (channel: string, payload?: unknown, event?: unknown) => {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`No handler for ${channel}`);
      }
      return handler(event ?? { sender: { id: 1 } }, payload);
    },
  };
}

describe("search IPC canonical surface", () => {
  beforeEach(() => {
    resetP3LifecycleParticipantsForTests();
    resetSearchLifecycleScopeForTests();
  });

  it("只暴露 search:fts:* 通道，不再保留 search:project:* 双轨 surface", () => {
    const { handlers } = createHarness();

    expect(handlers.has("search:fts:query")).toBe(true);
    expect(handlers.has("search:fts:reindex")).toBe(true);
    expect(handlers.has("search:project:query")).toBe(false);
    expect(handlers.has("search:project:reindex")).toBe(false);
    expect(handlers.has("search:project:indexstatus")).toBe(false);
  });

  it("拒绝 renderer session 与 payload projectId 不一致的 search:fts 请求", async () => {
    const harness = createHarness();
    harness.projectSessionBinding.bind({
      webContentsId: 1,
      projectId: "proj-active",
    });

    const result = (await harness.invoke("search:fts:query", {
      projectId: "proj-foreign",
      query: "林远",
    })) as {
      ok: boolean;
      error?: { code: string; message: string };
    };

    expect(result.ok).toBe(false);
    expect(result.error).toEqual({
      code: "SEARCH_PROJECT_FORBIDDEN",
      message: "search projectId must match the active renderer project",
    });
  });

  it("项目切换后仅允许 lifecycle 绑定到的新项目继续 search:fts:*", async () => {
    const harness = createHarness();
    const searchParticipant = harness.participants.get("search");
    harness.projectSessionBinding.bind({
      webContentsId: 1,
      projectId: "proj-a",
    });

    await searchParticipant?.bind({
      projectId: "proj-a",
      traceId: "trace-bind-a",
      signal: new AbortController().signal,
    });

    const initialQuery = (await harness.invoke("search:fts:query", {
      projectId: "proj-a",
      query: "林远",
    })) as { ok: boolean };
    expect(initialQuery.ok).toBe(true);

    await searchParticipant?.unbind({
      projectId: "proj-a",
      traceId: "trace-unbind-a",
      signal: new AbortController().signal,
    });
    harness.projectSessionBinding.bind({
      webContentsId: 1,
      projectId: "proj-b",
    });

    const duringSwitch = (await harness.invoke("search:fts:query", {
      projectId: "proj-b",
      query: "林远",
    })) as {
      ok: boolean;
      error?: { code: string; message: string };
    };
    expect(duringSwitch.ok).toBe(false);
    expect(duringSwitch.error).toEqual({
      code: "SEARCH_PROJECT_FORBIDDEN",
      message: "search is temporarily unbound during project switch",
    });

    await searchParticipant?.bind({
      projectId: "proj-b",
      traceId: "trace-bind-b",
      signal: new AbortController().signal,
    });

    const staleProjectQuery = (await harness.invoke("search:fts:query", {
      projectId: "proj-a",
      query: "林远",
    })) as {
      ok: boolean;
      error?: { code: string; message: string };
    };
    expect(staleProjectQuery.ok).toBe(false);
    expect(staleProjectQuery.error).toEqual({
      code: "SEARCH_PROJECT_FORBIDDEN",
      message: "search projectId must match the active renderer project",
    });

    const reboundQuery = (await harness.invoke("search:fts:query", {
      projectId: "proj-b",
      query: "林远",
    })) as { ok: boolean };
    expect(reboundQuery.ok).toBe(true);

    const reboundReindex = (await harness.invoke("search:fts:reindex", {
      projectId: "proj-b",
    })) as { ok: boolean };
    expect(reboundReindex.ok).toBe(true);
  });
});
