import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const RENDERER_SRC_DIR = resolve(CURRENT_DIR, "..", "..");

function readRendererFile(relativePath: string): string {
  return readFileSync(resolve(RENDERER_SRC_DIR, relativePath), "utf8");
}

describe("S3-I18N-EXTRACT-S1: hardcoded chinese literals are extracted to locale keys", () => {
  it("replaces hardcoded chinese literals with t(key) rendering", () => {
    const commandPaletteSource = readRendererFile(
      "features/commandPalette/CommandPalette.tsx",
    );
    const statusBarSource = readRendererFile("components/layout/StatusBar.tsx");
    const saveIndicatorSource = readRendererFile(
      "components/layout/SaveIndicator.tsx",
    );
    const appShellSource = readRendererFile("components/layout/AppShell.tsx");
    const infoPanelSource = readRendererFile(
      "features/rightpanel/InfoPanel.tsx",
    );

    expect(commandPaletteSource).not.toContain(
      'placeholder="搜索命令或文件..."',
    );
    expect(commandPaletteSource).not.toContain("未找到匹配结果");
    expect(commandPaletteSource).not.toMatch(/>\s*导航\s*</);
    expect(commandPaletteSource).not.toMatch(/>\s*选择\s*</);
    expect(commandPaletteSource).not.toMatch(/>\s*关闭\s*</);
    expect(commandPaletteSource).toMatch(
      /t\(["']workbench\.commandPalette\.searchPlaceholder["']\)/,
    );
    expect(commandPaletteSource).toMatch(
      /t\(["']workbench\.commandPalette\.emptyResult["']\)/,
    );

    expect(statusBarSource).not.toContain("未命名项目");
    expect(statusBarSource).not.toContain("未命名文档");
    expect(statusBarSource).toMatch(
      /t\(["']workbench\.statusBar\.unnamedProject["']\)/,
    );
    expect(statusBarSource).toMatch(
      /t\(["']workbench\.statusBar\.unnamedDocument["']\)/,
    );
    expect(statusBarSource).toMatch(
      /t\(["']workbench\.statusBar\.wordCount["']/,
    );

    expect(saveIndicatorSource).not.toContain("保存中...");
    expect(saveIndicatorSource).not.toContain("已保存");
    expect(saveIndicatorSource).not.toContain("保存失败");
    expect(saveIndicatorSource).toMatch(
      /t\(["']workbench\.saveIndicator\.saving["']\)/,
    );
    expect(saveIndicatorSource).toMatch(
      /t\(["']workbench\.saveIndicator\.saved["']\)/,
    );
    expect(saveIndicatorSource).toMatch(
      /t\(["']workbench\.saveIndicator\.error["']\)/,
    );

    expect(appShellSource).not.toContain('group: "命令"');
    expect(appShellSource).not.toContain('group: "文件"');
    expect(appShellSource).not.toContain('group: "最近使用"');

    expect(infoPanelSource).not.toContain("查看版本历史");
    expect(infoPanelSource).toMatch(
      /t\(["']workbench\.infoPanel\.openVersionHistory["']\)/,
    );
  });
});
