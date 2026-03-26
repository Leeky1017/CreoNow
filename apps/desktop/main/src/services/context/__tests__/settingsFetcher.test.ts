import { describe, expect, it, vi } from "vitest";

import type {
  MemoryInjectionItem,
  MemoryService,
} from "../../memory/memoryService";
import { createSettingsFetcher } from "../fetchers/settingsFetcher";

const BASE_REQUEST = {
  projectId: "proj-settings-fetcher",
  documentId: "doc-1",
  cursorPosition: 18,
  skillId: "continue-writing",
};

function createMemoryItem(args: {
  id: string;
  content: string;
  origin: "learned" | "manual";
}): MemoryInjectionItem {
  return {
    id: args.id,
    type: "preference",
    scope: "project",
    origin: args.origin,
    content: args.content,
    reason: { kind: "deterministic" },
  };
}

describe("createSettingsFetcher", () => {
  it("should inject memory items into settings layer", async () => {
    const previewInjection = vi.fn<MemoryService["previewInjection"]>(() => ({
      ok: true,
      data: {
        mode: "deterministic",
        items: [
          createMemoryItem({
            id: "m1",
            content: "动作场景偏好短句",
            origin: "learned",
          }),
          createMemoryItem({
            id: "m2",
            content: "严格第一人称叙述",
            origin: "manual",
          }),
        ],
      },
    }));
    const fetcher = createSettingsFetcher({
      memoryService: {
        previewInjection,
      },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(previewInjection).toHaveBeenCalledWith({
      projectId: "proj-settings-fetcher",
      documentId: "doc-1",
    });
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.source).toBe("memory:injection");
    expect(result.chunks[0]?.content).toContain("动作场景偏好短句");
    expect(result.chunks[0]?.content).toContain("严格第一人称叙述");
  });

  it("should return warning marker when no memory items", async () => {
    const previewInjection = vi.fn<MemoryService["previewInjection"]>(() => ({
      ok: true,
      data: {
        mode: "deterministic",
        items: [],
      },
    }));
    const fetcher = createSettingsFetcher({
      memoryService: {
        previewInjection,
      },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(result.chunks).toEqual([]);
    expect(result.warnings?.[0]).toContain("MEMORY_DEGRADED");
  });

  it("should degrade with MEMORY_UNAVAILABLE on error", async () => {
    const previewInjection = vi.fn<MemoryService["previewInjection"]>(() => {
      throw new Error("DB locked");
    });
    const fetcher = createSettingsFetcher({
      memoryService: {
        previewInjection,
      },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(result.chunks).toEqual([]);
    expect(result.warnings?.[0]).toContain("MEMORY_UNAVAILABLE");
  });

  it("should report MEMORY_DEGRADED on semantic degradation", async () => {
    const previewInjection = vi.fn<MemoryService["previewInjection"]>(() => ({
      ok: true,
      data: {
        mode: "deterministic",
        items: [
          createMemoryItem({
            id: "m3",
            content: "偏好简洁风格",
            origin: "learned",
          }),
        ],
        diagnostics: {
          degradedFrom: "semantic",
          reason: "embedding service unavailable",
        },
      },
    }));
    const fetcher = createSettingsFetcher({
      memoryService: {
        previewInjection,
      },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.content).toContain("偏好简洁风格");
    expect(result.warnings).toContainEqual(
      expect.stringContaining("MEMORY_DEGRADED"),
    );
  });

  it("should include origin in formatted output", async () => {
    const previewInjection = vi.fn<MemoryService["previewInjection"]>(() => ({
      ok: true,
      data: {
        mode: "deterministic",
        items: [
          createMemoryItem({
            id: "m4",
            content: "偏好简洁风格",
            origin: "learned",
          }),
        ],
      },
    }));
    const fetcher = createSettingsFetcher({
      memoryService: {
        previewInjection,
      },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(result.chunks[0]?.content).toContain("偏好简洁风格");
    expect(result.chunks[0]?.content).toMatch(/自动学习|learned/);
  });
});
