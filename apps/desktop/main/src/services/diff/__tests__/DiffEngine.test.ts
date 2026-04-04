import { describe, it, expect } from "vitest";

import { computeTransaction, makeDiffError } from "../DiffEngine";
import type { ProseMirrorTransactionSpec, DiffError } from "../types";
import { DIFF_MAX_CHARS } from "../types";

describe("DiffEngine — computeTransaction", () => {
  it("两个空字符串 → 步骤为空", () => {
    const result: ProseMirrorTransactionSpec = computeTransaction("", "");

    expect(result.steps).toHaveLength(0);
    expect(result.before).toBe("");
    expect(result.after).toBe("");
    expect(result.stats.totalChanges).toBe(0);
  });

  it("纯插入（空 → 有内容）", () => {
    const result = computeTransaction("", "hello world");

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toEqual({
      type: "insert",
      from: 0,
      to: 0,
      text: "hello world",
    });
    expect(result.stats.insertions).toBe(1);
    expect(result.stats.insertedChars).toBe(11);
  });

  it("纯删除（有内容 → 空）", () => {
    const result = computeTransaction("hello world", "");

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toEqual({
      type: "delete",
      from: 0,
      to: 11,
    });
    expect(result.stats.deletions).toBe(1);
    expect(result.stats.deletedChars).toBe(11);
  });

  it("混合替换（部分修改）", () => {
    const result = computeTransaction("hello world", "hello there");

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toEqual({
      type: "replace",
      from: 6,
      to: 11,
      text: "there",
    });
    expect(result.stats.replacements).toBe(1);
  });

  it("相同字符串 → 步骤为空", () => {
    const text = "identical content";
    const result = computeTransaction(text, text);

    expect(result.steps).toHaveLength(0);
    expect(result.stats.totalChanges).toBe(0);
  });

  it("中文文本 diff", () => {
    const result = computeTransaction("你好世界", "你好中国");

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toEqual({
      type: "replace",
      from: 2,
      to: 4,
      text: "中国",
    });
    expect(result.stats.replacements).toBe(1);
    expect(result.stats.insertedChars).toBe(2);
    expect(result.stats.deletedChars).toBe(2);
  });

  it("大文档超限 → DIFF_INPUT_TOO_LARGE", () => {
    const big = "x".repeat(DIFF_MAX_CHARS + 1);

    expect(() => computeTransaction(big, "")).toThrow();

    try {
      computeTransaction(big, "");
    } catch (e) {
      const err = e as DiffError;
      expect(err.code).toBe("DIFF_INPUT_TOO_LARGE");
    }
  });

  it("stats 正确计算", () => {
    // Replace: "world" → "there" (delete 5, insert 5)
    const result = computeTransaction("hello world", "hello there");

    expect(result.stats).toEqual({
      insertions: 0,
      deletions: 0,
      replacements: 1,
      totalChanges: 1,
      insertedChars: 5,
      deletedChars: 5,
    });
  });
});

describe("makeDiffError", () => {
  it("创建带 code 的 DiffError", () => {
    const err = makeDiffError("DIFF_COMPUTE_FAILED", "boom");

    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("DIFF_COMPUTE_FAILED");
    expect(err.message).toBe("boom");
  });
});
