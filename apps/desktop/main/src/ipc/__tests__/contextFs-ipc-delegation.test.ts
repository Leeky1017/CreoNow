import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IpcMain } from "electron";
import { registerContextFsHandlers } from "../contextFs";

vi.mock("../../services/context/contextFs", () => ({
  ensureCreonowDirStructureAsync: vi.fn().mockResolvedValue({ ok: true, data: { ensured: true } }),
  getCreonowDirStatusAsync: vi.fn().mockResolvedValue({ ok: true, data: { exists: true } }),
  getCreonowRootPath: vi.fn().mockReturnValue("/projects/p1/.creonow"),
  listCreonowFilesAsync: vi.fn().mockResolvedValue({
    ok: true,
    data: { items: [{ path: ".creonow/rules/tone.md", sizeBytes: 100, updatedAtMs: 1000 }] },
  }),
  readCreonowTextFileAsync: vi.fn().mockResolvedValue({
    ok: true,
    data: { content: "rule content", sizeBytes: 12, updatedAtMs: 2000 },
  }),
}));

vi.mock("@shared/redaction/redact", () => ({
  redactText: vi.fn().mockReturnValue({
    redactedText: "rule content",
    evidence: [],
  }),
}));

vi.mock("../../db/paths", () => ({
  redactUserDataPath: vi.fn().mockReturnValue("<redacted>"),
}));

vi.mock("../projectAccessGuard", () => ({
  guardAndNormalizeProjectAccess: vi.fn().mockReturnValue({ ok: true }),
}));

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

const EXPECTED_CHANNELS = [
  "context:creonow:ensure",
  "context:creonow:status",
  "context:watch:start",
  "context:watch:stop",
  "context:rules:list",
  "context:settings:list",
  "context:rules:read",
  "context:settings:read",
] as const;

function createMockEvent() {
  return { sender: { id: 1, send: vi.fn() } };
}

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

  const stmtGet = vi.fn().mockReturnValue({ rootPath: "/projects/p1" });
  const stmtAll = vi.fn().mockReturnValue([]);

  const db =
    opts?.db === null
      ? null
      : (opts?.db ?? {
          prepare: vi.fn().mockReturnValue({
            get: stmtGet,
            all: stmtAll,
            run: vi.fn(),
          }),
        });

  const watchService = {
    start: vi.fn().mockReturnValue({ ok: true, data: { watching: true as const } }),
    stop: vi.fn().mockReturnValue({ ok: true, data: { watching: false as const } }),
    isWatching: vi.fn().mockReturnValue(false),
  };

  registerContextFsHandlers({
    ipcMain,
    db: db as never,
    logger: logger as never,
    userDataDir: "/test-user-data",
    watchService: watchService as never,
  });

  return {
    invoke: async (
      channel: string,
      payload?: unknown,
    ): Promise<{
      ok: boolean;
      data?: unknown;
      error?: { code: string; message: string };
    }> => {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return (await handler(createMockEvent(), payload)) as {
        ok: boolean;
        data?: unknown;
        error?: { code: string; message: string };
      };
    },
    handlers,
    logger,
    db,
    watchService,
    stmtGet,
  };
}

describe("contextFs IPC handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Channel registration ──

  it("registers all expected channels", () => {
    const { handlers } = createHarness();
    for (const ch of EXPECTED_CHANNELS) {
      expect(handlers.has(ch), `missing handler for ${ch}`).toBe(true);
    }
  });

  it("channel count matches expected", () => {
    const { handlers } = createHarness();
    expect(handlers.size).toBe(EXPECTED_CHANNELS.length);
  });

  // ── DB_ERROR when db is null ──

  describe("returns DB_ERROR when db is null", () => {
    const DB_GUARDED_CHANNELS = [
      "context:creonow:ensure",
      "context:creonow:status",
      "context:watch:start",
      "context:rules:list",
      "context:settings:list",
      "context:rules:read",
      "context:settings:read",
    ];

    it.each(DB_GUARDED_CHANNELS)("%s → DB_ERROR", async (channel) => {
      const { invoke } = createHarness({ db: null });
      const res = await invoke(channel, { projectId: "p1", path: ".creonow/rules/tone.md" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("DB_ERROR");
    });
  });

  // ── INVALID_ARGUMENT when projectId is missing/empty ──

  describe("returns INVALID_ARGUMENT when projectId is missing", () => {
    const CHANNELS_REQUIRING_PROJECT = [
      "context:creonow:ensure",
      "context:creonow:status",
      "context:watch:start",
      "context:watch:stop",
      "context:rules:list",
      "context:settings:list",
    ];

    it.each(CHANNELS_REQUIRING_PROJECT)("%s → INVALID_ARGUMENT for empty projectId", async (channel) => {
      const { invoke } = createHarness();
      const res = await invoke(channel, { projectId: "" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it.each(CHANNELS_REQUIRING_PROJECT)("%s → INVALID_ARGUMENT for whitespace-only projectId", async (channel) => {
      const { invoke } = createHarness();
      const res = await invoke(channel, { projectId: "   " });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });
  });

  // ── NOT_FOUND when project row is missing ──

  describe("returns NOT_FOUND when project is not in DB", () => {
    it("context:creonow:ensure → NOT_FOUND", async () => {
      const { invoke, stmtGet } = createHarness();
      stmtGet.mockReturnValue(undefined);
      const res = await invoke("context:creonow:ensure", { projectId: "nonexistent" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("NOT_FOUND");
    });

    it("context:creonow:status → NOT_FOUND", async () => {
      const { invoke, stmtGet } = createHarness();
      stmtGet.mockReturnValue(undefined);
      const res = await invoke("context:creonow:status", { projectId: "nonexistent" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("NOT_FOUND");
    });

    it("context:watch:start → NOT_FOUND", async () => {
      const { invoke, stmtGet } = createHarness();
      stmtGet.mockReturnValue(undefined);
      const res = await invoke("context:watch:start", { projectId: "nonexistent" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("NOT_FOUND");
    });

    it("context:rules:list → NOT_FOUND", async () => {
      const { invoke, stmtGet } = createHarness();
      stmtGet.mockReturnValue(undefined);
      const res = await invoke("context:rules:list", { projectId: "nonexistent" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("NOT_FOUND");
    });

    it("context:settings:list → NOT_FOUND", async () => {
      const { invoke, stmtGet } = createHarness();
      stmtGet.mockReturnValue(undefined);
      const res = await invoke("context:settings:list", { projectId: "nonexistent" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("NOT_FOUND");
    });
  });

  // ── Happy path delegation ──

  describe("happy path delegation", () => {
    it("context:creonow:ensure → returns rootPath and ensured", async () => {
      const { invoke } = createHarness();
      const res = await invoke("context:creonow:ensure", { projectId: "p1" });
      expect(res.ok).toBe(true);
      expect(res.data).toEqual({ rootPath: "/projects/p1", ensured: true });
    });

    it("context:creonow:status → returns exists and watching", async () => {
      const { invoke } = createHarness();
      const res = await invoke("context:creonow:status", { projectId: "p1" });
      expect(res.ok).toBe(true);
      const data = res.data as { exists: boolean; watching: boolean; rootPath: string };
      expect(data.exists).toBe(true);
      expect(data.watching).toBe(false);
      expect(data.rootPath).toBe("/projects/p1");
    });

    it("context:watch:start → delegates to watchService.start", async () => {
      const { invoke, watchService } = createHarness();
      const res = await invoke("context:watch:start", { projectId: "p1" });
      expect(res.ok).toBe(true);
      expect(watchService.start).toHaveBeenCalled();
    });

    it("context:watch:stop → delegates to watchService.stop", async () => {
      const { invoke, watchService } = createHarness();
      const res = await invoke("context:watch:stop", { projectId: "p1" });
      expect(res.ok).toBe(true);
      expect(watchService.stop).toHaveBeenCalledWith({ projectId: "p1" });
    });

    it("context:rules:list → returns items", async () => {
      const { invoke } = createHarness();
      const res = await invoke("context:rules:list", { projectId: "p1" });
      expect(res.ok).toBe(true);
      const data = res.data as { items: unknown[] };
      expect(data.items).toHaveLength(1);
    });

    it("context:settings:list → returns items", async () => {
      const { invoke } = createHarness();
      const res = await invoke("context:settings:list", { projectId: "p1" });
      expect(res.ok).toBe(true);
      const data = res.data as { items: unknown[] };
      expect(data.items).toHaveLength(1);
    });

    it("context:rules:read → returns content with redaction", async () => {
      const { invoke } = createHarness();
      const res = await invoke("context:rules:read", {
        projectId: "p1",
        path: ".creonow/rules/tone.md",
      });
      expect(res.ok).toBe(true);
      const data = res.data as { content: string; path: string };
      expect(data.content).toBe("rule content");
      expect(data.path).toBe(".creonow/rules/tone.md");
    });

    it("context:settings:read → returns content with redaction", async () => {
      const { invoke } = createHarness();
      const res = await invoke("context:settings:read", {
        projectId: "p1",
        path: ".creonow/settings/prefs.json",
      });
      expect(res.ok).toBe(true);
      const data = res.data as { content: string };
      expect(data.content).toBe("rule content");
    });
  });

  // ── Path scope validation ──

  describe("path scope validation for read handlers", () => {
    it("context:rules:read rejects path outside .creonow/rules/", async () => {
      const { invoke } = createHarness();
      const res = await invoke("context:rules:read", {
        projectId: "p1",
        path: ".creonow/settings/prefs.json",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("context:settings:read rejects path outside .creonow/settings/", async () => {
      const { invoke } = createHarness();
      const res = await invoke("context:settings:read", {
        projectId: "p1",
        path: ".creonow/rules/tone.md",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("context:rules:read rejects non-string path", async () => {
      const { invoke } = createHarness();
      const res = await invoke("context:rules:read", {
        projectId: "p1",
        path: 42,
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });
  });

  // ── Error handling (exception path) ──

  describe("error handling", () => {
    it("context:creonow:ensure → IO_ERROR on service exception", async () => {
      const { ensureCreonowDirStructureAsync } = await import(
        "../../services/context/contextFs"
      );
      vi.mocked(ensureCreonowDirStructureAsync).mockRejectedValueOnce(
        new Error("disk full"),
      );
      const { invoke, logger } = createHarness();
      const res = await invoke("context:creonow:ensure", { projectId: "p1" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("IO_ERROR");
      expect(logger.error).toHaveBeenCalled();
    });

    it("context:creonow:status → IO_ERROR on service exception", async () => {
      const { getCreonowDirStatusAsync } = await import(
        "../../services/context/contextFs"
      );
      vi.mocked(getCreonowDirStatusAsync).mockRejectedValueOnce(
        new Error("permission denied"),
      );
      const { invoke } = createHarness();
      const res = await invoke("context:creonow:status", { projectId: "p1" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("IO_ERROR");
    });

    it("context:watch:stop → IO_ERROR on watchService exception", async () => {
      const h = createHarness();
      h.watchService.stop.mockImplementation(() => {
        throw new Error("watcher crash");
      });
      const res = await h.invoke("context:watch:stop", { projectId: "p1" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("IO_ERROR");
    });

    it("context:watch:start → IO_ERROR on exception", async () => {
      const { ensureCreonowDirStructureAsync } = await import(
        "../../services/context/contextFs"
      );
      vi.mocked(ensureCreonowDirStructureAsync).mockRejectedValueOnce(
        new Error("boom"),
      );
      const { invoke } = createHarness();
      const res = await invoke("context:watch:start", { projectId: "p1" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("IO_ERROR");
    });

    it("context:rules:list → IO_ERROR on exception", async () => {
      const { listCreonowFilesAsync } = await import(
        "../../services/context/contextFs"
      );
      vi.mocked(listCreonowFilesAsync).mockRejectedValueOnce(
        new Error("read error"),
      );
      const { invoke } = createHarness();
      const res = await invoke("context:rules:list", { projectId: "p1" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("IO_ERROR");
    });

    it("context:settings:list → IO_ERROR on exception", async () => {
      const { listCreonowFilesAsync } = await import(
        "../../services/context/contextFs"
      );
      vi.mocked(listCreonowFilesAsync).mockRejectedValueOnce(
        new Error("read error"),
      );
      const { invoke } = createHarness();
      const res = await invoke("context:settings:list", { projectId: "p1" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("IO_ERROR");
    });
  });

  // ── Propagation of service errors ──

  describe("propagates service errors", () => {
    it("context:creonow:ensure → propagates ensureCreonowDirStructure error", async () => {
      const { ensureCreonowDirStructureAsync } = await import(
        "../../services/context/contextFs"
      );
      vi.mocked(ensureCreonowDirStructureAsync).mockResolvedValueOnce({
        ok: false,
        error: { code: "IO_ERROR", message: "cannot create dir" },
      });
      const { invoke } = createHarness();
      const res = await invoke("context:creonow:ensure", { projectId: "p1" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("IO_ERROR");
    });

    it("context:creonow:status → propagates getCreonowDirStatus error", async () => {
      const { getCreonowDirStatusAsync } = await import(
        "../../services/context/contextFs"
      );
      vi.mocked(getCreonowDirStatusAsync).mockResolvedValueOnce({
        ok: false,
        error: { code: "IO_ERROR", message: "stat failed" },
      });
      const { invoke } = createHarness();
      const res = await invoke("context:creonow:status", { projectId: "p1" });
      expect(res.ok).toBe(false);
    });

    it("context:watch:start → propagates watchService.start error", async () => {
      const h = createHarness();
      h.watchService.start.mockReturnValue({
        ok: false,
        error: { code: "IO_ERROR", message: "watcher failed" },
      });
      const res = await h.invoke("context:watch:start", { projectId: "p1" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("IO_ERROR");
    });

    it("context:watch:stop → propagates watchService.stop error", async () => {
      const h = createHarness();
      h.watchService.stop.mockReturnValue({
        ok: false,
        error: { code: "IO_ERROR", message: "stop failed" },
      });
      const res = await h.invoke("context:watch:stop", { projectId: "p1" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("IO_ERROR");
    });
  });

  // ── Redaction evidence ──

  describe("redaction evidence", () => {
    it("context:rules:read logs redaction evidence when present", async () => {
      const { redactText } = await import("@shared/redaction/redact");
      vi.mocked(redactText).mockReturnValueOnce({
        redactedText: "***",
        evidence: [{ patternId: "email", sourceRef: "test", matchCount: 2 }],
      });
      const { invoke, logger } = createHarness();
      const res = await invoke("context:rules:read", {
        projectId: "p1",
        path: ".creonow/rules/tone.md",
      });
      expect(res.ok).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        "context_redaction_applied",
        expect.objectContaining({ patternId: "email" }),
      );
    });
  });
});
