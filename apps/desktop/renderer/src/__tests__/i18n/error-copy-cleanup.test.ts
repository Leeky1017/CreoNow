/**
 * A0-22 i18n 错误文案清理守卫
 *
 * 验证 locale 文件中不存在错误码前缀和占位模板，
 * 且调用点已移除多余参数。
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const LOCALES_DIR = path.resolve(
  __dirname,
  "../../i18n/locales",
);

function loadLocale(locale: string): Record<string, unknown> {
  const raw = fs.readFileSync(path.join(LOCALES_DIR, `${locale}.json`), "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

/** 递归提取所有叶子节点 string 值 */
function flattenValues(
  obj: Record<string, unknown>,
  prefix = "",
): Array<{ key: string; value: string }> {
  const entries: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      entries.push({ key: fullKey, value: v });
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      entries.push(
        ...flattenValues(v as Record<string, unknown>, fullKey),
      );
    }
  }
  return entries;
}

/** 递归取嵌套 key */
function getNestedValue(obj: Record<string, unknown>, keyPath: string): unknown {
  const parts = keyPath.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && !Array.isArray(cur)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

// ---------- Scenario 1: export.error.noProject ----------

describe("export.error.noProject 文案", () => {
  it(`zh-CN 值为「请先打开一个项目」，不含错误码前缀`, () => {
    const zhCN = loadLocale("zh-CN");
    const val = getNestedValue(zhCN, "export.error.noProject");
    expect(val).toBe("请先打开一个项目");
    expect(val).not.toMatch(/^[A-Z][A-Z_]+:/);
  });

  it("en 值为 'Please open a project first'，不含错误码前缀", () => {
    const en = loadLocale("en");
    const val = getNestedValue(en, "export.error.noProject");
    expect(val).toBe("Please open a project first");
    expect(val).not.toMatch(/^[A-Z][A-Z_]+:/);
  });
});

// ---------- Scenario 2: rightPanel.quality.errorWithCode ----------

describe("rightPanel.quality.errorWithCode 文案", () => {
  it(`zh-CN 值为「质量检测遇到问题」，不含 {{code}} 插值`, () => {
    const zhCN = loadLocale("zh-CN");
    const val = getNestedValue(zhCN, "rightPanel.quality.errorWithCode");
    expect(val).toBe("质量检测遇到问题");
    expect(val).not.toContain("{{code}}");
    expect(val).not.toContain("{{errorCode}}");
  });

  it("en 值为 'Quality check encountered an issue'，不含 {{code}} 插值", () => {
    const en = loadLocale("en");
    const val = getNestedValue(en, "rightPanel.quality.errorWithCode");
    expect(val).toBe("Quality check encountered an issue");
    expect(val).not.toContain("{{code}}");
    expect(val).not.toContain("{{errorCode}}");
  });
});

// ---------- Scenario 2 续: 调用点参数移除 ----------

describe("errorWithCode 调用点不传 { code } 参数", () => {
  it("QualityPanel.tsx 中不再有 t('...errorWithCode', { code: ... }) 模式", () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../features/rightpanel/QualityPanel.tsx",
      ),
      "utf-8",
    );
    // 不应存在带第二参数的 errorWithCode 调用
    expect(src).not.toMatch(/errorWithCode['"],\s*\{/);
  });

  it("renderer/src/ 下全部源文件不存在 errorWithCode + { code 模式", () => {
    const srcRoot = path.resolve(__dirname, "../../");
    const files = collectFiles(srcRoot, /\.(tsx?|jsx?)$/).filter(
      (f) => !f.includes(".test."),
    );
    const violations: string[] = [];
    for (const f of files) {
      const content = fs.readFileSync(f, "utf-8");
      if (/errorWithCode['"],\s*\{/.test(content)) {
        violations.push(path.relative(srcRoot, f));
      }
    }
    expect(violations).toEqual([]);
  });
});

// ---------- Scenario 3: 全量扫描 ----------

const ERROR_CODE_PREFIX = /^[A-Z][A-Z_]{2,}:\s/;
const PLACEHOLDER_PATTERNS = [/\{\{code\}\}/, /\{\{errorCode\}\}/, /\{\{error_code\}\}/];

describe("locale 文件全量扫描——无错误码前缀与占位模板", () => {
  for (const locale of ["zh-CN", "en"] as const) {
    describe(locale, () => {
      it("无任何值含大写蛇形错误码前缀", () => {
        const data = loadLocale(locale);
        const all = flattenValues(data);
        const violations = all.filter((e) => ERROR_CODE_PREFIX.test(e.value));
        expect(violations.map((v) => `${v.key}: ${v.value}`)).toEqual([]);
      });

      it("无任何值含 {{code}} / {{errorCode}} / {{error_code}} 插值", () => {
        const data = loadLocale(locale);
        const all = flattenValues(data);
        const violations = all.filter((e) =>
          PLACEHOLDER_PATTERNS.some((p) => p.test(e.value)),
        );
        expect(violations.map((v) => `${v.key}: ${v.value}`)).toEqual([]);
      });
    });
  }
});

// ---------- helpers ----------

function collectFiles(dir: string, ext: RegExp): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") {
      results.push(...collectFiles(full, ext));
    } else if (entry.isFile() && ext.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}
