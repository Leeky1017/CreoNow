import { describe, expect, it } from "vitest";

import en from "../locales/en.json";
import zhCN from "../locales/zh-CN.json";

type LocaleNode = Record<string, LocaleNode | string>;

function flattenKeys(node: LocaleNode, prefix = ""): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      return [path];
    }
    return flattenKeys(value, path);
  });
}

describe("S3-I18N-EXTRACT-S2: locale key parity", () => {
  it("locale key sets stay in parity across zh-CN and en", () => {
    const zhKeys = flattenKeys(zhCN as LocaleNode).sort();
    const enKeys = flattenKeys(en as LocaleNode).sort();

    expect(zhKeys).toEqual(enKeys);
  });
});
