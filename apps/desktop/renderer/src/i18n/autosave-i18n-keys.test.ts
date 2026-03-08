import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const AUTOSAVE_KEYS = [
  "workbench.autosave.status.saving",
  "workbench.autosave.status.saved",
  "workbench.autosave.status.error",
  "workbench.autosave.toast.error.title",
  "workbench.autosave.toast.error.description",
  "workbench.autosave.toast.error.retry",
  "workbench.autosave.toast.retrySuccess.title",
  "workbench.autosave.toast.flushError.title",
  "workbench.autosave.toast.flushError.description",
  "workbench.autosave.a11y.retryLabel",
] as const;

function loadLocale(locale: string): Record<string, unknown> {
  const filePath = path.resolve(
    __dirname,
    "locales",
    `${locale}.json`,
  );
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<
    string,
    unknown
  >;
}

function getNestedValue(
  obj: Record<string, unknown>,
  keyPath: string,
): unknown {
  const parts = keyPath.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

describe("autosave i18n key 完整性 (AC-9)", () => {
  const enData = loadLocale("en");
  const zhData = loadLocale("zh-CN");

  it.each(AUTOSAVE_KEYS)("en.json 包含 key: %s", (key) => {
    const value = getNestedValue(enData, key);
    expect(value).toBeDefined();
    expect(typeof value).toBe("string");
    expect((value as string).length).toBeGreaterThan(0);
  });

  it.each(AUTOSAVE_KEYS)("zh-CN.json 包含 key: %s", (key) => {
    const value = getNestedValue(zhData, key);
    expect(value).toBeDefined();
    expect(typeof value).toBe("string");
    expect((value as string).length).toBeGreaterThan(0);
  });

  it("中英文 autosave key 数量一致", () => {
    const enAutosave = getNestedValue(enData, "workbench.autosave") as Record<
      string,
      unknown
    >;
    const zhAutosave = getNestedValue(zhData, "workbench.autosave") as Record<
      string,
      unknown
    >;
    expect(enAutosave).toBeDefined();
    expect(zhAutosave).toBeDefined();
    expect(JSON.stringify(Object.keys(enAutosave).sort())).toEqual(
      JSON.stringify(Object.keys(zhAutosave).sort()),
    );
  });
});
