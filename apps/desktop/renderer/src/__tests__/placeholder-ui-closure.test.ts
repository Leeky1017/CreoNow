/**
 * A0-15: 占位 UI 收口
 *
 * 验证：
 * - 禁用按钮有 aria-disabled
 * - "View More" / "Search All Projects" 已移除
 * - ChatHistory 不含 console.info
 * - common.comingSoon / common.featureInDevelopment i18n key 存在
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const RENDERER_SRC = resolve(CURRENT_DIR, "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(RENDERER_SRC, relativePath), "utf-8");
}

function loadLocale(lang: string): Record<string, unknown> {
  const raw = readFileSync(
    resolve(RENDERER_SRC, `i18n/locales/${lang}.json`),
    "utf-8",
  );
  return JSON.parse(raw) as Record<string, unknown>;
}

describe("A0-15: placeholder UI closure", () => {
  describe("i18n common namespace", () => {
    for (const lang of ["zh-CN", "en"]) {
      it(`${lang} 包含 common.comingSoon key`, () => {
        const data = loadLocale(lang);
        const common = data["common"] as Record<string, string> | undefined;
        expect(common).toBeDefined();
        expect(common!["comingSoon"]).toBeDefined();
        expect(typeof common!["comingSoon"]).toBe("string");
        expect(common!["comingSoon"].length).toBeGreaterThan(0);
      });

      it(`${lang} 包含 common.featureInDevelopment key`, () => {
        const data = loadLocale(lang);
        const common = data["common"] as Record<string, string> | undefined;
        expect(common).toBeDefined();
        expect(common!["featureInDevelopment"]).toBeDefined();
        expect(typeof common!["featureInDevelopment"]).toBe("string");
        expect(common!["featureInDevelopment"].length).toBeGreaterThan(0);
      });
    }
  });

  describe("SearchPanel: noisy links removed", () => {
    it("不渲染 searchAllProjects 按钮", () => {
      const source = readSource("features/search/SearchPanel.tsx");
      expect(source).not.toContain("searchAllProjects");
    });

    it("不渲染 viewMore 按钮", () => {
      const source = readSource("features/search/SearchPanel.tsx");
      expect(source).not.toContain("results.viewMore");
    });
  });

  describe("ChatHistory: 无 console.info 泄露", () => {
    it("RightPanel onSelectChat 不含 console.info", () => {
      const source = readSource("components/layout/RightPanel.tsx");
      // Check that the ChatHistory onSelectChat handler doesn't use console.info
      const onSelectChatBlock = source.slice(
        source.indexOf("onSelectChat"),
        source.indexOf("onSelectChat") + 300,
      );
      expect(onSelectChatBlock).not.toContain("console.info");
    });
  });

  describe("SettingsAccount: 禁用按钮有 aria-disabled", () => {
    it("SettingsAccount 包含 aria-disabled=\"true\"", () => {
      const source = readSource(
        "features/settings-dialog/SettingsAccount.tsx",
      );
      expect(source).toContain('aria-disabled="true"');
    });

    it("SettingsAccount 包含 Tooltip 包裹", () => {
      const source = readSource(
        "features/settings-dialog/SettingsAccount.tsx",
      );
      expect(source).toContain("Tooltip");
      expect(source).toContain("featureInDevelopment");
    });
  });

  describe("VersionHistoryPanel: Restore 按钮已禁用", () => {
    it("VersionCard 中 Restore 按钮包含 disabled 属性", () => {
      const source = readSource(
        "features/version-history/VersionHistoryPanel.tsx",
      );
      // The selected version card restore button should be disabled
      const restoreSection = source.slice(
        source.indexOf('versionHistory.panel.restore') - 200,
        source.indexOf('versionHistory.panel.restore') + 50,
      );
      expect(restoreSection).toContain("disabled");
    });
  });
});
