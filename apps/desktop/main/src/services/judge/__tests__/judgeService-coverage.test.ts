import { describe, it, expect, vi, beforeEach } from "vitest";
import { createJudgeService } from "../judgeService";

function createLogger() {
  return {
    logPath: "/dev/null",
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

describe("JudgeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // ── Initial state ──

  it("starts in not_ready state", () => {
    const svc = createJudgeService({
      logger: createLogger() as never,
      isE2E: false,
    });
    expect(svc.getState().status).toBe("not_ready");
  });

  // ── Non-E2E mode (rule engine) ──

  describe("non-E2E mode", () => {
    it("ensure transitions to ready immediately", async () => {
      const logger = createLogger();
      const svc = createJudgeService({
        logger: logger as never,
        isE2E: false,
      });

      const result = await svc.ensure();
      expect(result.ok).toBe(true);
      expect(svc.getState().status).toBe("ready");
      expect(logger.info).toHaveBeenCalledWith(
        "judge_ensure_started",
        expect.objectContaining({ isE2E: false }),
      );
      expect(logger.info).toHaveBeenCalledWith("judge_ensure_succeeded", {});
    });

    it("subsequent ensure returns ready without re-running", async () => {
      const logger = createLogger();
      const svc = createJudgeService({
        logger: logger as never,
        isE2E: false,
      });

      await svc.ensure();
      logger.info.mockClear();

      const result = await svc.ensure();
      expect(result.ok).toBe(true);
      expect(logger.info).not.toHaveBeenCalledWith(
        "judge_ensure_started",
        expect.anything(),
      );
    });
  });

  // ── E2E mode (simulated download) ──

  describe("E2E mode", () => {
    it("ensure transitions through downloading to ready", async () => {
      const logger = createLogger();
      const svc = createJudgeService({
        logger: logger as never,
        isE2E: true,
        defaultTimeoutMs: 5000,
      });

      const result = await svc.ensure();
      expect(result.ok).toBe(true);
      expect(svc.getState().status).toBe("ready");
    });

    it("ensure with very short timeout errors out", async () => {
      vi.useFakeTimers();
      const logger = createLogger();
      const svc = createJudgeService({
        logger: logger as never,
        isE2E: true,
        defaultTimeoutMs: 1,
      });

      const ensurePromise = svc.ensure();
      vi.advanceTimersByTime(50);
      const result = await ensurePromise;

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("TIMEOUT");
      }
      expect(svc.getState().status).toBe("error");
      expect(logger.error).toHaveBeenCalledWith(
        "judge_ensure_failed",
        expect.objectContaining({ code: "TIMEOUT" }),
      );
    });
  });

  // ── Inflight dedup ──

  describe("inflight deduplication", () => {
    it("concurrent ensure calls share the same promise", async () => {
      const svc = createJudgeService({
        logger: createLogger() as never,
        isE2E: true,
        defaultTimeoutMs: 5000,
      });

      const [r1, r2] = await Promise.all([svc.ensure(), svc.ensure()]);
      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);
    });
  });

  // ── State logging ──

  describe("state transitions are logged", () => {
    it("logs downloading then ready states", async () => {
      const logger = createLogger();
      const svc = createJudgeService({
        logger: logger as never,
        isE2E: false,
      });

      await svc.ensure();

      const stateLogs = logger.info.mock.calls
        .filter(([tag]) => tag === "judge_state")
        .map(([, data]) => data.status);
      expect(stateLogs).toContain("downloading");
      expect(stateLogs).toContain("ready");
    });
  });

  // ── Custom timeout ──

  describe("timeout handling", () => {
    it("uses args.timeoutMs over defaultTimeoutMs", async () => {
      const logger = createLogger();
      const svc = createJudgeService({
        logger: logger as never,
        isE2E: true,
        defaultTimeoutMs: 100,
      });

      const result = await svc.ensure({ timeoutMs: 5000 });
      expect(result.ok).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        "judge_ensure_started",
        expect.objectContaining({ timeoutMs: 5000 }),
      );
    });

    it("clamps negative timeout to 0", async () => {
      const logger = createLogger();
      const svc = createJudgeService({
        logger: logger as never,
        isE2E: false,
      });

      const result = await svc.ensure({ timeoutMs: -100 });
      expect(result.ok).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        "judge_ensure_started",
        expect.objectContaining({ timeoutMs: 0 }),
      );
    });
  });
});
