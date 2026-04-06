import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __getFormatterCacheSizeForTests,
  __resetFormatterCacheForTests,
  formatRelativeTime,
} from "@/lib/formatRelativeTime";

describe("formatRelativeTime", () => {
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    nowSpy = vi.spyOn(Date, "now").mockReturnValue(new Date("2026-01-01T00:00:00.000Z").getTime());
    __resetFormatterCacheForTests();
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it("同 locale 重复格式化会复用 RelativeTimeFormat 实例", () => {
    formatRelativeTime("2025-12-31T23:59:00.000Z", "zh-CN");
    formatRelativeTime("2025-12-31T23:58:00.000Z", "zh-CN");

    expect(__getFormatterCacheSizeForTests()).toBe(1);
  });

  it("不同 locale 会分别缓存 formatter", () => {
    formatRelativeTime("2025-12-31T23:59:00.000Z", "de-DE");
    formatRelativeTime("2025-12-31T23:59:00.000Z", "en-US");

    expect(__getFormatterCacheSizeForTests()).toBe(2);
  });
});
