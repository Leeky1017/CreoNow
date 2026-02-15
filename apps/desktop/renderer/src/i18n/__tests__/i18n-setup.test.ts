import { beforeEach, describe, expect, it } from "vitest";

import { i18n, initializeI18n } from "../index";

describe("i18n setup", () => {
  beforeEach(async () => {
    await initializeI18n();
    await i18n.changeLanguage("zh-CN");
  });

  it("initializes i18n with zh-CN default and en fallback", async () => {
    await initializeI18n();

    expect(i18n.options.lng).toBe("zh-CN");
    const fallback = i18n.options.fallbackLng;
    if (typeof fallback === "string") {
      expect(fallback).toBe("en");
    } else if (Array.isArray(fallback)) {
      expect(fallback).toContain("en");
    } else {
      expect(fallback?.default).toContain("en");
    }
    expect(i18n.t("workbench.bootstrap.appShell")).toBe("工作台外壳");
  });

  it("missing key follows fallback strategy with observable output", () => {
    expect(i18n.t("workbench.bootstrap.fallbackOnly")).toBe(
      "Fallback only in English",
    );

    const missing = i18n.t("workbench.bootstrap.missingEverywhere");
    expect(missing).toBe("workbench.bootstrap.missingEverywhere");
    expect(missing).not.toBe("");
  });
});
