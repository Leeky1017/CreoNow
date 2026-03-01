import assert from "node:assert/strict";

import type { IpcMain } from "electron";

import type { Logger } from "../../logging/logger";
import { registerSearchIpcHandlers } from "../search";
import { createProjectSessionBindingRegistry } from "../projectSessionBinding";
import type { HybridRankingService } from "../../services/search/hybridRankingService";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function createIpcHarness(): {
  handlers: Map<string, Handler>;
  ipcMain: IpcMain;
} {
  const handlers = new Map<string, Handler>();
  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;
  return { handlers, ipcMain };
}

function createEvent(webContentsId: number): { sender: { id: number } } {
  return { sender: { id: webContentsId } };
}

// Scenario: all project-scoped search channels reject mismatched bound projectId [ADDED]
{
  const binding = createProjectSessionBindingRegistry();
  binding.bind({ webContentsId: 77, projectId: "project-bound" });

  const harness = createIpcHarness();
  registerSearchIpcHandlers({
    ipcMain: harness.ipcMain,
    db: null,
    logger: createLogger(),
    projectSessionBinding: binding,
  });

  const channels: Array<{ name: string; payload: unknown }> = [
    {
      name: "search:fts:query",
      payload: { projectId: "project-other", query: "needle" },
    },
    {
      name: "search:fts:reindex",
      payload: { projectId: "project-other" },
    },
    {
      name: "search:query:strategy",
      payload: {
        projectId: "project-other",
        query: "needle",
        strategy: "fts",
      },
    },
    {
      name: "search:rank:explain",
      payload: {
        projectId: "project-other",
        query: "needle",
        strategy: "fts",
      },
    },
    {
      name: "search:replace:preview",
      payload: {
        projectId: "project-other",
        scope: "wholeProject",
        query: "a",
        replaceWith: "b",
      },
    },
    {
      name: "search:replace:execute",
      payload: {
        projectId: "project-other",
        scope: "wholeProject",
        query: "a",
        replaceWith: "b",
      },
    },
  ];

  for (const channel of channels) {
    const handler = harness.handlers.get(channel.name);
    assert.ok(handler, `expected handler ${channel.name}`);
    const denied = (await handler!(createEvent(77), channel.payload)) as {
      ok: boolean;
      error?: { code?: string };
    };
    assert.equal(denied.ok, false, `${channel.name} should be denied`);
    assert.equal(
      denied.error?.code,
      "FORBIDDEN",
      `${channel.name} should return FORBIDDEN`,
    );
  }
}

// Scenario: unbound renderer session fails closed for project-scoped search channels [ADDED]
{
  const binding = createProjectSessionBindingRegistry();
  const harness = createIpcHarness();
  registerSearchIpcHandlers({
    ipcMain: harness.ipcMain,
    db: null,
    logger: createLogger(),
    projectSessionBinding: binding,
  });

  const ftsQuery = harness.handlers.get("search:fts:query");
  assert.ok(ftsQuery, "expected search:fts:query handler");

  const deniedWhenUnbound = (await ftsQuery!(createEvent(999), {
    projectId: "project-guess",
    query: "needle",
  })) as {
    ok: boolean;
    error?: { code?: string };
  };

  assert.equal(deniedWhenUnbound.ok, false);
  assert.equal(deniedWhenUnbound.error?.code, "FORBIDDEN");
}

// Scenario: blank projectId is normalized to bound project id before strategy query [ADDED]
{
  const binding = createProjectSessionBindingRegistry();
  binding.bind({ webContentsId: 101, projectId: "project-bound" });

  let observedProjectId: string | null = null;
  const ranking: HybridRankingService = {
    queryByStrategy: (payload) => {
      observedProjectId = payload.projectId;
      if (payload.projectId !== "project-bound") {
        return {
          ok: false as const,
          error: {
            code: "INVALID_ARGUMENT",
            message: "projectId was not normalized",
          },
        };
      }
      return {
        ok: true as const,
        data: {
          traceId: "trace-search",
          costMs: 1,
          strategy: payload.strategy,
          fallback: "none",
          results: [],
          total: 0,
          hasMore: false,
          backpressure: {
            candidateLimit: 10_000,
            candidateCount: 0,
            truncated: false,
          },
        },
      };
    },
    rankExplain: () => ({
      ok: true,
      data: {
        strategy: "fts",
        explanations: [],
        total: 0,
        backpressure: {
          candidateLimit: 10_000,
          candidateCount: 0,
          truncated: false,
        },
      },
    }),
  };

  const harness = createIpcHarness();
  registerSearchIpcHandlers({
    ipcMain: harness.ipcMain,
    db: {} as never,
    logger: createLogger(),
    projectSessionBinding: binding,
    hybridRankingService: ranking,
  });

  const queryByStrategy = harness.handlers.get("search:query:strategy");
  assert.ok(queryByStrategy, "expected search:query:strategy handler");

  const response = (await queryByStrategy!(createEvent(101), {
    projectId: "   ",
    query: "needle",
    strategy: "fts",
  })) as {
    ok: boolean;
    error?: { code?: string };
  };

  assert.equal(response.ok, true);
  assert.equal(observedProjectId, "project-bound");
}
