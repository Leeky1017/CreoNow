import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";

import {
  getCreonowRootPath,
  ensureCreonowDirStructure,
  getCreonowDirStatus,
  listCreonowFiles,
  readCreonowTextFile,
  ensureCreonowDirStructureAsync,
  getCreonowDirStatusAsync,
  listCreonowFilesAsync,
  readCreonowTextFileAsync,
  resolveContextFsReadStrategy,
  CONTEXT_FS_STREAM_READ_THRESHOLD_BYTES,
} from "../contextFs";

vi.mock("node:fs");
vi.mock("node:fs/promises");

function mockStatSync(overrides?: Partial<fs.Stats>): fs.Stats {
  return {
    isDirectory: vi.fn().mockReturnValue(true),
    isFile: vi.fn().mockReturnValue(true),
    size: 100,
    mtimeMs: 1000,
    ...overrides,
  } as unknown as fs.Stats;
}

describe("contextFs service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── getCreonowRootPath ──

  describe("getCreonowRootPath", () => {
    it("joins .creonow to project root", () => {
      const result = getCreonowRootPath("/home/user/project");
      expect(result).toBe(path.join("/home/user/project", ".creonow"));
    });
  });

  // ── resolveContextFsReadStrategy ──

  describe("resolveContextFsReadStrategy", () => {
    it("returns 'direct' for small files", () => {
      expect(resolveContextFsReadStrategy(1000)).toBe("direct");
    });

    it("returns 'stream' for large files", () => {
      expect(
        resolveContextFsReadStrategy(CONTEXT_FS_STREAM_READ_THRESHOLD_BYTES + 1),
      ).toBe("stream");
    });

    it("returns 'direct' at threshold boundary", () => {
      expect(
        resolveContextFsReadStrategy(CONTEXT_FS_STREAM_READ_THRESHOLD_BYTES),
      ).toBe("direct");
    });
  });

  // ── ensureCreonowDirStructure (sync) ──

  describe("ensureCreonowDirStructure", () => {
    it("creates dirs and default files", () => {
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const result = ensureCreonowDirStructure("/project");
      expect(result.ok).toBe(true);
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it("skips writing files that already exist", () => {
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = ensureCreonowDirStructure("/project");
      expect(result.ok).toBe(true);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it("returns IO_ERROR on mkdir failure", () => {
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        throw new Error("permission denied");
      });

      const result = ensureCreonowDirStructure("/project");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("IO_ERROR");
      }
    });
  });

  // ── getCreonowDirStatus (sync) ──

  describe("getCreonowDirStatus", () => {
    it("returns exists: true when directory exists", () => {
      vi.mocked(fs.statSync).mockReturnValue(mockStatSync());
      const result = getCreonowDirStatus("/project");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.exists).toBe(true);
      }
    });

    it("returns exists: false on ENOENT", () => {
      const err = new Error("not found") as NodeJS.ErrnoException;
      err.code = "ENOENT";
      vi.mocked(fs.statSync).mockImplementation(() => {
        throw err;
      });

      const result = getCreonowDirStatus("/project");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.exists).toBe(false);
      }
    });

    it("returns IO_ERROR on non-ENOENT error", () => {
      vi.mocked(fs.statSync).mockImplementation(() => {
        throw new Error("disk error");
      });

      const result = getCreonowDirStatus("/project");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("IO_ERROR");
      }
    });

    it("returns exists: false when path is not a directory", () => {
      vi.mocked(fs.statSync).mockReturnValue(
        mockStatSync({ isDirectory: vi.fn().mockReturnValue(false) }),
      );
      const result = getCreonowDirStatus("/project");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.exists).toBe(false);
      }
    });
  });

  // ── listCreonowFiles (sync) ──

  describe("listCreonowFiles", () => {
    it("returns items for rules scope", () => {
      vi.mocked(fs.statSync).mockReturnValue(mockStatSync());
      vi.mocked(fs.readdirSync).mockReturnValue([
        {
          name: "style.md",
          isDirectory: () => false,
          isFile: () => true,
        } as fs.Dirent,
      ] as unknown as fs.Dirent<NonSharedBuffer>[]);

      const result = listCreonowFiles({
        projectRootPath: "/project",
        scope: "rules",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items).toHaveLength(1);
        expect(result.data.items[0].path).toContain("style.md");
      }
    });

    it("returns empty items when directory does not exist", () => {
      const err = new Error("not found") as NodeJS.ErrnoException;
      err.code = "ENOENT";
      vi.mocked(fs.statSync).mockImplementation(() => {
        throw err;
      });

      const result = listCreonowFiles({
        projectRootPath: "/project",
        scope: "rules",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items).toHaveLength(0);
      }
    });

    it("recursively lists files in subdirectories", () => {
      const statImpl = vi.fn().mockReturnValue(mockStatSync());
      vi.mocked(fs.statSync).mockImplementation(statImpl);
      vi.mocked(fs.readdirSync).mockImplementation((_dirPath) => {
        const dir = String(_dirPath);
        if (dir.includes("subdir")) {
          return [
            { name: "nested.md", isDirectory: () => false, isFile: () => true } as fs.Dirent,
          ] as unknown as fs.Dirent<NonSharedBuffer>[];
        }
        return [
          { name: "subdir", isDirectory: () => true, isFile: () => false } as fs.Dirent,
          { name: "top.md", isDirectory: () => false, isFile: () => true } as fs.Dirent,
        ] as unknown as fs.Dirent<NonSharedBuffer>[];
      });

      const result = listCreonowFiles({
        projectRootPath: "/project",
        scope: "rules",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // ── readCreonowTextFile (sync) ──

  describe("readCreonowTextFile", () => {
    it("reads file content", () => {
      vi.mocked(fs.statSync).mockReturnValue(
        mockStatSync({ size: 50, mtimeMs: 2000 }),
      );
      vi.mocked(fs.readFileSync).mockReturnValue("file content");

      const result = readCreonowTextFile({
        projectRootPath: "/project",
        path: ".creonow/rules/style.md",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.content).toBe("file content");
        expect(result.data.sizeBytes).toBe(50);
      }
    });

    it("rejects path traversal", () => {
      const result = readCreonowTextFile({
        projectRootPath: "/project",
        path: ".creonow/../../../etc/passwd",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("rejects paths not starting with .creonow/", () => {
      const result = readCreonowTextFile({
        projectRootPath: "/project",
        path: "other/file.txt",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("rejects null bytes in path", () => {
      const result = readCreonowTextFile({
        projectRootPath: "/project",
        path: ".creonow/rules/\x00evil.md",
      });
      expect(result.ok).toBe(false);
    });

    it("returns NOT_FOUND for missing file", () => {
      const err = new Error("not found") as NodeJS.ErrnoException;
      err.code = "ENOENT";
      vi.mocked(fs.statSync).mockImplementation(() => {
        throw err;
      });

      const result = readCreonowTextFile({
        projectRootPath: "/project",
        path: ".creonow/rules/missing.md",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("returns UNSUPPORTED for non-file", () => {
      vi.mocked(fs.statSync).mockReturnValue(
        mockStatSync({ isFile: vi.fn().mockReturnValue(false) }),
      );

      const result = readCreonowTextFile({
        projectRootPath: "/project",
        path: ".creonow/rules/somedir",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("UNSUPPORTED");
      }
    });
  });

  // ── Async variants ──

  describe("ensureCreonowDirStructureAsync", () => {
    it("creates dirs and default files asynchronously", async () => {
      vi.mocked(fsPromises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fsPromises.access).mockRejectedValue(new Error("not found"));
      vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined);

      const result = await ensureCreonowDirStructureAsync("/project");
      expect(result.ok).toBe(true);
    });

    it("returns IO_ERROR on async failure", async () => {
      vi.mocked(fsPromises.mkdir).mockRejectedValue(
        new Error("permission denied"),
      );

      const result = await ensureCreonowDirStructureAsync("/project");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("IO_ERROR");
      }
    });
  });

  describe("getCreonowDirStatusAsync", () => {
    it("returns exists: true for existing directory", async () => {
      vi.mocked(fsPromises.stat).mockResolvedValue(mockStatSync());

      const result = await getCreonowDirStatusAsync("/project");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.exists).toBe(true);
      }
    });

    it("returns exists: false on ENOENT", async () => {
      const err = new Error("not found") as NodeJS.ErrnoException;
      err.code = "ENOENT";
      vi.mocked(fsPromises.stat).mockRejectedValue(err);

      const result = await getCreonowDirStatusAsync("/project");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.exists).toBe(false);
      }
    });
  });

  describe("listCreonowFilesAsync", () => {
    it("returns items from async listing", async () => {
      vi.mocked(fsPromises.stat).mockResolvedValue(mockStatSync());
      vi.mocked(fsPromises.readdir).mockResolvedValue([
        { name: "file.md", isDirectory: () => false, isFile: () => true } as fs.Dirent,
      ] as unknown as fs.Dirent<NonSharedBuffer>[]);

      const result = await listCreonowFilesAsync({
        projectRootPath: "/project",
        scope: "settings",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items).toHaveLength(1);
      }
    });

    it("returns empty on ENOENT", async () => {
      const err = new Error("not found") as NodeJS.ErrnoException;
      err.code = "ENOENT";
      vi.mocked(fsPromises.stat).mockRejectedValue(err);

      const result = await listCreonowFilesAsync({
        projectRootPath: "/project",
        scope: "settings",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items).toHaveLength(0);
      }
    });
  });

  describe("readCreonowTextFileAsync", () => {
    it("reads file content asynchronously", async () => {
      vi.mocked(fsPromises.stat).mockResolvedValue(
        mockStatSync({ size: 50, mtimeMs: 3000 }),
      );
      vi.mocked(fsPromises.readFile).mockResolvedValue("async content");

      const result = await readCreonowTextFileAsync({
        projectRootPath: "/project",
        path: ".creonow/rules/style.md",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.content).toBe("async content");
      }
    });

    it("rejects path traversal in async variant", async () => {
      const result = await readCreonowTextFileAsync({
        projectRootPath: "/project",
        path: ".creonow/../../etc/passwd",
      });
      expect(result.ok).toBe(false);
    });
  });
});
