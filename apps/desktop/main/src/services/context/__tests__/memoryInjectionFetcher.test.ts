import { describe, expect, it, vi } from "vitest";

import type { SimpleMemoryService } from "../../memory/simpleMemoryService";
import { createMemoryInjectionFetcher } from "../fetchers/memoryInjectionFetcher";

const BASE_REQUEST = {
  projectId: "proj-mem-inject",
  documentId: "doc-1",
  cursorPosition: 10,
  skillId: "continue",
  additionalInput: "她站在门口，看着远方的山。",
};

describe("createMemoryInjectionFetcher", () => {
  it("should inject memory text into settings layer", async () => {
    const inject = vi.fn<SimpleMemoryService["inject"]>(() =>
      Promise.resolve({
        success: true,
        data: {
          records: [
            {
              id: "r1",
              projectId: "proj-mem-inject",
              key: "style:dialogue",
              value: "对话偏好短句",
              source: "user",
              category: "preferences",
              createdAt: 1000,
              updatedAt: 1000,
            },
          ],
          injectedText: "style:dialogue: 对话偏好短句",
          tokenCount: 12,
          degraded: false,
        },
      }),
    );

    const fetcher = createMemoryInjectionFetcher({
      simpleMemoryService: { inject },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(inject).toHaveBeenCalledWith("proj-mem-inject", {
      documentText: "她站在门口，看着远方的山。",
    });
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.source).toBe("simple-memory:injection");
    expect(result.chunks[0]?.content).toContain("[项目记忆 — 自动注入]");
    expect(result.chunks[0]?.content).toContain("对话偏好短句");
    expect(result.chunks[0]?.projectId).toBe("proj-mem-inject");
  });

  it("should return empty with warning when inject fails", async () => {
    const inject = vi.fn<SimpleMemoryService["inject"]>(() =>
      Promise.resolve({
        success: false,
        error: { code: "DB_ERROR", message: "database locked" },
      }),
    );

    const fetcher = createMemoryInjectionFetcher({
      simpleMemoryService: { inject },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(result.chunks).toHaveLength(0);
    expect(result.warnings).toContain(
      "SIMPLE_MEMORY_UNAVAILABLE: 简单记忆数据未注入",
    );
  });

  it("should return empty with warning when no records", async () => {
    const inject = vi.fn<SimpleMemoryService["inject"]>(() =>
      Promise.resolve({
        success: true,
        data: {
          records: [],
          injectedText: "",
          tokenCount: 0,
          degraded: false,
        },
      }),
    );

    const fetcher = createMemoryInjectionFetcher({
      simpleMemoryService: { inject },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(result.chunks).toHaveLength(0);
    expect(result.warnings).toContain(
      "SIMPLE_MEMORY_EMPTY: 无可用记忆",
    );
  });

  it("should add degraded warning when injection is token-budget truncated", async () => {
    const inject = vi.fn<SimpleMemoryService["inject"]>(() =>
      Promise.resolve({
        success: true,
        data: {
          records: [
            {
              id: "r1",
              projectId: "proj-mem-inject",
              key: "k",
              value: "v",
              source: "user",
              category: "preferences",
              createdAt: 1000,
              updatedAt: 1000,
            },
          ],
          injectedText: "k: v",
          tokenCount: 5,
          degraded: true,
        },
      }),
    );

    const fetcher = createMemoryInjectionFetcher({
      simpleMemoryService: { inject },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(result.chunks).toHaveLength(1);
    expect(result.warnings).toContain(
      "SIMPLE_MEMORY_DEGRADED: token budget exceeded",
    );
  });

  it("should degrade gracefully on thrown error", async () => {
    const inject = vi.fn<SimpleMemoryService["inject"]>(() =>
      Promise.reject(new Error("connection lost")),
    );

    const fetcher = createMemoryInjectionFetcher({
      simpleMemoryService: { inject },
    });

    const result = await fetcher(BASE_REQUEST);

    expect(result.chunks).toHaveLength(0);
    expect(result.warnings).toContain(
      "SIMPLE_MEMORY_UNAVAILABLE: 简单记忆数据未注入",
    );
  });
});
