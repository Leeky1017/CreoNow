/**
 * IPC integration test for `knowledge:impact:preview`.
 *
 * Validates:
 * - channel is registered on a freshly built harness
 * - read-only path: invokes the analyzer without going through the write
 *   orchestrator (INV-6 exempt — read-only preview)
 * - payload shape matches the contract (severity ladder + typed-confirmation flag)
 * - DB_ERROR is returned when the main process has no database bound
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IpcMain } from "electron";

import { registerKnowledgeGraphIpcHandlers } from "../knowledgeGraph";

const impactPreviewSpy = vi.fn();

vi.mock("../../services/kg/impactAnalyzer", async () => {
  const actual = await vi.importActual<
    typeof import("../../services/kg/impactAnalyzer")
  >("../../services/kg/impactAnalyzer");
  return {
    ...actual,
    createKgImpactAnalyzer: vi.fn(() => ({
      preview: impactPreviewSpy,
    })),
  };
});

// The KG IPC module depends on several peer services; provide minimal mocks
// so the handler under test can register without side effects.
vi.mock("../../services/kg/kgService", () => ({
  createKnowledgeGraphService: vi.fn(() => ({
    entityCreate: vi.fn(),
    entityRead: vi.fn(),
    entityList: vi.fn(),
    entityUpdate: vi.fn(),
    entityDelete: vi.fn(),
    relationCreate: vi.fn(),
    relationList: vi.fn(),
    relationUpdate: vi.fn(),
    relationDelete: vi.fn(),
    querySubgraph: vi.fn(),
    queryPath: vi.fn(),
    queryValidate: vi.fn(),
    queryRelevant: vi.fn(),
    queryByIds: vi.fn(),
    buildRulesInjection: vi.fn(),
  })),
}));

vi.mock("../../services/kg/kgRecognitionRuntime", () => ({
  createKgRecognitionRuntime: vi.fn(() => ({
    enqueue: vi.fn(),
    cancel: vi.fn(),
    stats: vi.fn(),
    acceptSuggestion: vi.fn(),
    dismissSuggestion: vi.fn(),
  })),
}));

vi.mock("../../services/engagement/worldScaleService", () => ({
  createWorldScaleService: vi.fn(() => ({
    invalidateCache: vi.fn(),
    getWorldScale: vi.fn().mockReturnValue({
      entities: 0,
      relations: 0,
      constraints: 0,
    }),
  })),
}));

vi.mock("../../services/engagement/milestoneService", () => ({
  createMilestoneService: vi.fn(() => ({
    evaluateFromCurrentScale: vi.fn().mockReturnValue([]),
  })),
}));

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

function createHarness(opts?: { db?: unknown }) {
  const handlers = new Map<string, Handler>();
  const ipcMain = {
    handle: vi.fn((channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    }),
  } as unknown as IpcMain;

  const logger = {
    logPath: "/dev/null",
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const db =
    opts?.db === null
      ? null
      : (opts?.db ?? {
          prepare: vi.fn(),
          exec: vi.fn(),
          transaction: vi.fn(
            (fn: (...a: unknown[]) => unknown) =>
              (...args: unknown[]) =>
                fn(...args),
          ),
        });

  registerKnowledgeGraphIpcHandlers({
    ipcMain,
    db: db as never,
    logger: logger as never,
  });

  return {
    invoke: async (channel: string, payload: unknown) => {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`No handler for ${channel}`);
      }
      return (await handler(
        { sender: { id: 1, send: vi.fn() } },
        payload,
      )) as {
        ok: boolean;
        data?: unknown;
        error?: { code: string; message: string };
      };
    },
    handlers,
  };
}

describe("knowledge:impact:preview IPC handler", () => {
  beforeEach(() => {
    impactPreviewSpy.mockReset();
  });

  it("registers the channel", () => {
    const { handlers } = createHarness();
    expect(handlers.has("knowledge:impact:preview")).toBe(true);
  });

  it("returns DB_ERROR when db is null", async () => {
    const { invoke } = createHarness({ db: null });
    const res = await invoke("knowledge:impact:preview", {
      projectId: "p1",
      entityId: "e1",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("DB_ERROR");
    expect(impactPreviewSpy).not.toHaveBeenCalled();
  });

  it("forwards the payload to the analyzer and returns its data", async () => {
    const payload = {
      entity: { id: "e1", name: "Alice", type: "character" },
      incomingRelations: [],
      outgoingRelations: [],
      affectedForeshadows: [],
      totalRelationCount: 0,
      unresolvedForeshadowCount: 0,
      severity: "low" as const,
      requiresTypedConfirmation: false,
      queryCostMs: 3,
    };
    impactPreviewSpy.mockReturnValueOnce({ ok: true, data: payload });

    const { invoke } = createHarness();
    const res = await invoke("knowledge:impact:preview", {
      projectId: "p1",
      entityId: "e1",
    });

    expect(impactPreviewSpy).toHaveBeenCalledWith({
      projectId: "p1",
      entityId: "e1",
    });
    expect(res.ok).toBe(true);
    expect(res.data).toEqual(payload);
  });

  it("propagates service errors (NOT_FOUND)", async () => {
    impactPreviewSpy.mockReturnValueOnce({
      ok: false,
      error: { code: "NOT_FOUND", message: "Entity not found" },
    });
    const { invoke } = createHarness();
    const res = await invoke("knowledge:impact:preview", {
      projectId: "p1",
      entityId: "missing",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("NOT_FOUND");
  });
});
