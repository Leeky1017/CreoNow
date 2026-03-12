/**
 * A0-22: i18n 错误文案修正
 *
 * 确保 locale 文件中没有泄露技术错误码前缀（如 "NO_PROJECT:"）
 * 或裸露的 {{code}} / {{errorCode}} 插值。
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = resolve(CURRENT_DIR, "..", "i18n", "locales");

function loadLocale(lang: string): Record<string, unknown> {
  const raw = readFileSync(resolve(LOCALES_DIR, `${lang}.json`), "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

function flattenValues(
  obj: Record<string, unknown>,
  prefix = "",
): Array<{ key: string; value: string }> {
  const result: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      result.push({ key: path, value: v });
    } else if (typeof v === "object" && v !== null) {
      result.push(
        ...flattenValues(v as Record<string, unknown>, path),
      );
    }
  }
  return result;
}

/** Matches UPPERCASE_CODE: prefix patterns (≥3 chars, excludes URLs) */
const ERROR_CODE_PREFIX = /\b[A-Z_]{3,}:\s/;

/** Matches {{code}} or {{errorCode}} interpolations */
const CODE_INTERPOLATION = /\{\{(code|errorCode|error_code)\}\}/;

describe("A0-22: i18n error copy cleanup", () => {
  for (const lang of ["zh-CN", "en"]) {
    describe(`${lang} locale`, () => {
      const entries = flattenValues(loadLocale(lang));

      it("export.error.noProject 不含 error code 前缀", () => {
        const entry = entries.find((e) => e.key === "export.error.noProject");
        expect(entry).toBeDefined();
        expect(entry!.value).not.toMatch(ERROR_CODE_PREFIX);
      });

      it("rightPanel.quality.errorWithCode 不含 {{code}} 插值", () => {
        const entry = entries.find(
          (e) => e.key === "rightPanel.quality.errorWithCode",
        );
        expect(entry).toBeDefined();
        expect(entry!.value).not.toMatch(CODE_INTERPOLATION);
      });

      it("所有 error 相关 key 不含 error code 前缀", () => {
        const errorEntries = entries.filter(
          (e) =>
            e.key.toLowerCase().includes("error") &&
            !e.key.includes("http"),
        );
        const leaks = errorEntries.filter((e) =>
          ERROR_CODE_PREFIX.test(e.value),
        );
        expect(leaks).toEqual([]);
      });

      it("所有 key 不含裸 {{code}} / {{errorCode}} 插值", () => {
        const leaks = entries.filter((e) =>
          CODE_INTERPOLATION.test(e.value),
        );
        expect(leaks).toEqual([]);
      });
    });
  }

  it("zh-CN export.error.noProject 具体值正确", () => {
    const zh = flattenValues(loadLocale("zh-CN"));
    const entry = zh.find((e) => e.key === "export.error.noProject");
    expect(entry!.value).toBe("请先打开一个项目");
  });

  it("en export.error.noProject 具体值正确", () => {
    const en = flattenValues(loadLocale("en"));
    const entry = en.find((e) => e.key === "export.error.noProject");
    expect(entry!.value).toBe("Please open a project first");
  });

  it("zh-CN rightPanel.quality.errorWithCode 具体值正确", () => {
    const zh = flattenValues(loadLocale("zh-CN"));
    const entry = zh.find(
      (e) => e.key === "rightPanel.quality.errorWithCode",
    );
    expect(entry!.value).toBe("质量检测遇到问题");
  });

  it("en rightPanel.quality.errorWithCode 具体值正确", () => {
    const en = flattenValues(loadLocale("en"));
    const entry = en.find(
      (e) => e.key === "rightPanel.quality.errorWithCode",
    );
    expect(entry!.value).toBe("Quality check encountered an issue");
  });
});
