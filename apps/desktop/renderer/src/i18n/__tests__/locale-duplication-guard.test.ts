import { describe, expect, it } from "vitest";

import en from "../locales/en.json";
import zhCN from "../locales/zh-CN.json";

interface LocaleNode {
  [key: string]: LocaleNode | string;
}

function flattenEntries(node: LocaleNode, prefix = ""): Record<string, string> {
  return Object.entries(node).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "string") {
        acc[path] = value;
        return acc;
      }
      Object.assign(acc, flattenEntries(value, path));
      return acc;
    },
    {},
  );
}

describe("S3-I18N-EXTRACT-S3: locale duplication guard", () => {
  it("new locale keys do not introduce duplicated semantic entries", () => {
    const zhEntries = flattenEntries(zhCN as LocaleNode);
    const enEntries = flattenEntries(en as LocaleNode);

    const canonicalGroupKeys = [
      "workbench.commandPalette.groups.suggestions",
      "workbench.commandPalette.groups.layout",
      "workbench.commandPalette.groups.document",
      "workbench.commandPalette.groups.project",
      "workbench.commandPalette.groups.command",
      "workbench.commandPalette.groups.file",
      "workbench.commandPalette.groups.recent",
    ] as const;

    for (const key of canonicalGroupKeys) {
      expect(typeof zhEntries[key]).toBe("string");
      expect(typeof enEntries[key]).toBe("string");
    }

    const forbiddenAliasKeys = [
      "workbench.commandPalette.commandGroup",
      "workbench.commandPalette.groups.commands",
      "workbench.commandPalette.groups.files",
      "workbench.commandPalette.groups.recents",
    ] as const;

    for (const key of forbiddenAliasKeys) {
      expect(zhEntries[key]).toBeUndefined();
      expect(enEntries[key]).toBeUndefined();
    }

    const zhGroupValues = canonicalGroupKeys.map((key) => zhEntries[key]);
    const enGroupValues = canonicalGroupKeys.map((key) => enEntries[key]);

    expect(new Set(zhGroupValues).size).toBe(zhGroupValues.length);
    expect(new Set(enGroupValues).size).toBe(enGroupValues.length);
  });
});
