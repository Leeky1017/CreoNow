import { beforeEach, describe, expect, it } from "vitest";

import { i18n, initializeI18n } from "../index";

function normalizeFallbackLng(
  fallback: typeof i18n.options.fallbackLng,
): string[] {
  if (typeof fallback === "string") {
    return [fallback];
  }
  if (Array.isArray(fallback)) {
    return fallback.filter((item): item is string => typeof item === "string");
  }
  if (fallback && typeof fallback === "object" && "default" in fallback) {
    const defaultFallback = (fallback as { default?: unknown }).default;
    if (typeof defaultFallback === "string") {
      return [defaultFallback];
    }
    if (Array.isArray(defaultFallback)) {
      return defaultFallback.filter(
        (item): item is string => typeof item === "string",
      );
    }
  }
  return [];
}

describe("i18n setup", () => {
  beforeEach(async () => {
    await initializeI18n();
    await i18n.changeLanguage("zh-CN");
  });

  it("initializes i18n with zh-CN default and en fallback", async () => {
    await initializeI18n();

    expect(i18n.options.lng).toBe("zh-CN");
    expect(normalizeFallbackLng(i18n.options.fallbackLng)).toContain("en");
    expect(i18n.t("workbench.bootstrap.appShell")).toBe("工作台外壳");
  });

  it("missing key follows fallback strategy with observable output", async () => {
    await i18n.changeLanguage("fr-FR");
    expect(i18n.t("workbench.bootstrap.appShell")).toBe("Workbench Shell");
    await i18n.changeLanguage("zh-CN");

    const missing = i18n.t("workbench.bootstrap.missingEverywhere");
    expect(missing).toBe("workbench.bootstrap.missingEverywhere");
    expect(missing).not.toBe("");
  });
});
