import { describe, it, expect, vi } from "vitest";

import { createSkillFileIo, type DataProcessTaskRunner } from "../skillFileIo";

type DataProcessResult<T> =
  | { status: "completed"; value: T }
  | { status: "error" | "timeout" | "aborted" | "crashed"; error: Error };

function createMockDataProcess(
  impl?: <T>(args: {
    execute?: (signal: AbortSignal) => Promise<T>;
    timeoutMs?: number;
  }) => Promise<DataProcessResult<T>>,
): DataProcessTaskRunner {
  return {
    run: impl ?? (async <T>(args: {
      execute?: (signal: AbortSignal) => Promise<T>;
      run?: (signal: AbortSignal) => Promise<T>;
      timeoutMs?: number;
    }): Promise<DataProcessResult<T>> => {
      const fn = args.execute ?? args.run;
      if (!fn) {
        return { status: "error", error: new Error("no execute") };
      }
      const value = await fn(new AbortController().signal);
      return { status: "completed", value };
    }),
  };
}

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

describe("createSkillFileIo", () => {
  describe("timeout defaults", () => {
    it("should use DEFAULT_IO_TIMEOUT_MS (30000) when no timeoutMs provided", async () => {
      let capturedTimeout: number | undefined;
      const dp = createMockDataProcess(async (args) => {
        capturedTimeout = args.timeoutMs;
        const fn = args.execute;
        if (!fn) return { status: "error" as const, error: new Error("no fn") };
        const value = await fn(new AbortController().signal);
        return { status: "completed" as const, value };
      });

      const io = createSkillFileIo({ dataProcess: dp });
      const { default: fsMock } = await import("node:fs/promises");
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockResolvedValue("content");

      await io.read({ filePath: "/some/path" });
      expect(capturedTimeout).toBe(30_000);
    });

    it("should use provided timeoutMs when valid", async () => {
      let capturedTimeout: number | undefined;
      const dp = createMockDataProcess(async (args) => {
        capturedTimeout = args.timeoutMs;
        const fn = args.execute;
        if (!fn) return { status: "error" as const, error: new Error("no fn") };
        const value = await fn(new AbortController().signal);
        return { status: "completed" as const, value };
      });

      const io = createSkillFileIo({ dataProcess: dp, timeoutMs: 5000 });
      const { default: fsMock } = await import("node:fs/promises");
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockResolvedValue("content");

      await io.read({ filePath: "/some/path" });
      expect(capturedTimeout).toBe(5000);
    });

    it("should fall back to default when timeoutMs is 0", async () => {
      let capturedTimeout: number | undefined;
      const dp = createMockDataProcess(async (args) => {
        capturedTimeout = args.timeoutMs;
        const fn = args.execute;
        if (!fn) return { status: "error" as const, error: new Error("no fn") };
        const value = await fn(new AbortController().signal);
        return { status: "completed" as const, value };
      });

      const io = createSkillFileIo({ dataProcess: dp, timeoutMs: 0 });
      const { default: fsMock } = await import("node:fs/promises");
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockResolvedValue("ok");

      await io.read({ filePath: "/path" });
      expect(capturedTimeout).toBe(30_000);
    });

    it("should fall back to default when timeoutMs is negative", async () => {
      let capturedTimeout: number | undefined;
      const dp = createMockDataProcess(async (args) => {
        capturedTimeout = args.timeoutMs;
        const fn = args.execute;
        if (!fn) return { status: "error" as const, error: new Error("no fn") };
        const value = await fn(new AbortController().signal);
        return { status: "completed" as const, value };
      });

      const io = createSkillFileIo({ dataProcess: dp, timeoutMs: -100 });
      const { default: fsMock } = await import("node:fs/promises");
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockResolvedValue("ok");

      await io.read({ filePath: "/path" });
      expect(capturedTimeout).toBe(30_000);
    });

    it("should fall back to default when timeoutMs is NaN", async () => {
      let capturedTimeout: number | undefined;
      const dp = createMockDataProcess(async (args) => {
        capturedTimeout = args.timeoutMs;
        const fn = args.execute;
        if (!fn) return { status: "error" as const, error: new Error("no fn") };
        const value = await fn(new AbortController().signal);
        return { status: "completed" as const, value };
      });

      const io = createSkillFileIo({ dataProcess: dp, timeoutMs: NaN });
      const { default: fsMock } = await import("node:fs/promises");
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockResolvedValue("ok");

      await io.read({ filePath: "/path" });
      expect(capturedTimeout).toBe(30_000);
    });
  });

  describe("read", () => {
    it("should return file content on success", async () => {
      const dp = createMockDataProcess();
      const io = createSkillFileIo({ dataProcess: dp, timeoutMs: 100 });
      const { default: fsMock } = await import("node:fs/promises");
      (fsMock.readFile as ReturnType<typeof vi.fn>).mockResolvedValue("# Skill Content");

      const result = await io.read({ filePath: "/skills/SKILL.md" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe("# Skill Content");
      }
    });

    it("should return IO_ERROR when data process crashes", async () => {
      const dp: DataProcessTaskRunner = {
        run: async () => ({
          status: "crashed" as const,
          error: new Error("process died"),
        }),
      };
      const io = createSkillFileIo({ dataProcess: dp, timeoutMs: 100 });

      const result = await io.read({ filePath: "/nonexistent" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("IO_ERROR");
        expect(result.error.message).toBe("Failed to read skill file");
      }
    });

    it("should return IO_ERROR when data process times out", async () => {
      const dp: DataProcessTaskRunner = {
        run: async () => ({
          status: "timeout" as const,
          error: new Error("timed out"),
        }),
      };
      const io = createSkillFileIo({ dataProcess: dp, timeoutMs: 100 });

      const result = await io.read({ filePath: "/slow" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("IO_ERROR");
        expect(result.error.details).toEqual({
          status: "timeout",
          message: "timed out",
        });
      }
    });

    it("should return IO_ERROR when data process aborts", async () => {
      const dp: DataProcessTaskRunner = {
        run: async () => ({
          status: "aborted" as const,
          error: new Error("aborted by user"),
        }),
      };
      const io = createSkillFileIo({ dataProcess: dp, timeoutMs: 100 });

      const result = await io.read({ filePath: "/aborted" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("IO_ERROR");
        expect(result.error.details).toEqual({
          status: "aborted",
          message: "aborted by user",
        });
      }
    });
  });

  describe("write", () => {
    it("should return ok on successful write", async () => {
      const dp = createMockDataProcess();
      const io = createSkillFileIo({ dataProcess: dp, timeoutMs: 100 });
      const { default: fsMock } = await import("node:fs/promises");
      (fsMock.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (fsMock.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await io.write({
        filePath: "/skills/new/SKILL.md",
        content: "# New Skill",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe(true);
      }
    });

    it("should return IO_ERROR when data process errors", async () => {
      const dp: DataProcessTaskRunner = {
        run: async () => ({
          status: "error" as const,
          error: new Error("disk full"),
        }),
      };
      const io = createSkillFileIo({ dataProcess: dp, timeoutMs: 100 });

      const result = await io.write({
        filePath: "/skills/SKILL.md",
        content: "content",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("IO_ERROR");
        expect(result.error.message).toBe("Failed to write skill file");
        expect(result.error.details).toEqual({
          status: "error",
          message: "disk full",
        });
      }
    });
  });
});
