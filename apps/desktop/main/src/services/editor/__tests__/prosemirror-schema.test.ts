/**
 * ProseMirror 编辑器 Schema P1 测试
 * Spec: openspec/specs/editor/spec.md — ProseMirror Migration
 *
 * TDD Red Phase：测试应编译但因实现不存在而失败。
 * 验证 Schema 定义、Mark 支持、Markdown 输入规则、选区提取、hash 一致性。
 */

import { describe, it, expect } from "vitest";

import {
  editorSchema,
  createSelectionRef,
  computeSelectionTextHash,
  verifySelectionHash,
  getInputRules,
} from "../prosemirrorSchema";

// ─── helpers ────────────────────────────────────────────────────────

/** Create a minimal doc node from schema */
function createDoc(text: string) {
  const textNode = editorSchema.text(text);
  const paragraph = editorSchema.nodes.paragraph.create(null, textNode);
  return editorSchema.nodes.doc.create(null, paragraph);
}

/** Create a doc with a marked text node */
function createDocWithMark(text: string, markName: string) {
  const mark = editorSchema.marks[markName].create();
  const textNode = editorSchema.text(text, [mark]);
  const paragraph = editorSchema.nodes.paragraph.create(null, textNode);
  return editorSchema.nodes.doc.create(null, paragraph);
}

// ─── tests ──────────────────────────────────────────────────────────

describe("ProseMirror Editor Schema", () => {
  // ── Schema 定义 ───────────────────────────────────────────────

  describe("Schema Definition — 基本结构", () => {
    it("schema 包含 doc 节点", () => {
      expect(editorSchema.nodes.doc).toBeDefined();
    });

    it("doc 的 content 规则为 block+", () => {
      const docSpec = editorSchema.nodes.doc.spec;
      expect(docSpec.content).toBe("block+");
    });

    it("paragraph 属于 block group 且 content 为 inline*", () => {
      const paraSpec = editorSchema.nodes.paragraph.spec;
      expect(paraSpec.group).toBe("block");
      expect(paraSpec.content).toBe("inline*");
    });

    it("heading 支持 level 1-6 属性", () => {
      const headingSpec = editorSchema.nodes.heading.spec;
      expect(headingSpec).toBeDefined();
      expect(headingSpec.attrs?.level).toBeDefined();

      // Create heading nodes with different levels
      for (let level = 1; level <= 6; level++) {
        const heading = editorSchema.nodes.heading.create({ level });
        expect(heading.attrs.level).toBe(level);
      }
    });

    it("code_block 的 code 属性为 true（禁止 inline mark）", () => {
      const codeBlockSpec = editorSchema.nodes.code_block.spec;
      expect(codeBlockSpec.code).toBe(true);
    });

    it("text 属于 inline group", () => {
      const textSpec = editorSchema.nodes.text.spec;
      expect(textSpec.group).toBe("inline");
    });

    it("schema 包含 blockquote、horizontal_rule、list 节点", () => {
      expect(editorSchema.nodes.blockquote).toBeDefined();
      expect(editorSchema.nodes.horizontal_rule).toBeDefined();
      expect(editorSchema.nodes.bullet_list).toBeDefined();
      expect(editorSchema.nodes.ordered_list).toBeDefined();
      expect(editorSchema.nodes.list_item).toBeDefined();
    });

    it("可以创建合法的 doc → paragraph → text 结构", () => {
      const doc = createDoc("Hello, world!");
      expect(doc.type.name).toBe("doc");
      expect(doc.content.childCount).toBe(1);
      expect(doc.content.firstChild!.type.name).toBe("paragraph");
      expect(doc.content.firstChild!.textContent).toBe("Hello, world!");
    });
  });

  // ── Mark 支持 ─────────────────────────────────────────────────

  describe("Marks — 内联格式", () => {
    it("schema 包含 bold mark", () => {
      expect(editorSchema.marks.bold).toBeDefined();
    });

    it("schema 包含 italic mark", () => {
      expect(editorSchema.marks.italic).toBeDefined();
    });

    it("schema 包含 code mark", () => {
      expect(editorSchema.marks.code).toBeDefined();
    });

    it("schema 包含 underline mark", () => {
      expect(editorSchema.marks.underline).toBeDefined();
    });

    it("schema 包含 strikethrough mark", () => {
      expect(editorSchema.marks.strikethrough).toBeDefined();
    });

    it("bold mark 正确应用到文本", () => {
      const doc = createDocWithMark("粗体文本", "bold");
      const textNode = doc.content.firstChild!.content.firstChild!;

      expect(textNode.marks).toHaveLength(1);
      expect(textNode.marks[0].type.name).toBe("bold");
    });

    it("italic mark 正确应用到文本", () => {
      const doc = createDocWithMark("斜体文本", "italic");
      const textNode = doc.content.firstChild!.content.firstChild!;

      expect(textNode.marks).toHaveLength(1);
      expect(textNode.marks[0].type.name).toBe("italic");
    });

    it("code mark 正确应用到文本", () => {
      const doc = createDocWithMark("代码文本", "code");
      const textNode = doc.content.firstChild!.content.firstChild!;

      expect(textNode.marks).toHaveLength(1);
      expect(textNode.marks[0].type.name).toBe("code");
    });

    it("多个 mark 可同时应用（bold + italic）", () => {
      const boldMark = editorSchema.marks.bold.create();
      const italicMark = editorSchema.marks.italic.create();
      const textNode = editorSchema.text("粗斜体", [boldMark, italicMark]);
      const paragraph = editorSchema.nodes.paragraph.create(null, textNode);
      const doc = editorSchema.nodes.doc.create(null, paragraph);

      const resultText = doc.content.firstChild!.content.firstChild!;
      expect(resultText.marks).toHaveLength(2);
      const markNames = resultText.marks.map((m) => m.type.name);
      expect(markNames).toContain("bold");
      expect(markNames).toContain("italic");
    });
  });

  // ── Markdown 输入规则 ─────────────────────────────────────────

  describe("Input Rules — Markdown 快捷输入", () => {
    // Input Rules 的完整行为测试需要 EditorView 实例
    // P1 阶段在集成测试中验证，此处验证 inputRules 规则定义的结构

    it("editorInputRules 包含 bold 规则（**text** 触发）", () => {
      const rules = getInputRules();
      const boldRule = rules.find((r: { name: string }) => r.name === "bold");
      expect(boldRule).toBeDefined();
      expect(boldRule!.pattern).toBeInstanceOf(RegExp);
      expect("**hello**").toMatch(boldRule!.pattern);
    });

    it("editorInputRules 包含 italic 规则（*text* 触发）", () => {
      const rules = getInputRules();
      const italicRule = rules.find((r: { name: string }) => r.name === "italic");
      expect(italicRule).toBeDefined();
      expect(italicRule!.pattern).toBeInstanceOf(RegExp);
      expect("*hello*").toMatch(italicRule!.pattern);
    });

    it("editorInputRules 包含 heading 规则（# 触发）", () => {
      const rules = getInputRules();
      const headingRule = rules.find((r: { name: string }) => r.name === "heading");
      expect(headingRule).toBeDefined();
      expect(headingRule!.pattern).toBeInstanceOf(RegExp);
    });
  });

  // ── JSON 序列化往返 ───────────────────────────────────────────

  describe("Serialization — JSON 序列化往返", () => {
    it("editorSchema 可正确序列化并反序列化 doc", () => {
      const doc = createDoc("测试序列化");
      const json = doc.toJSON();
      const restored = editorSchema.nodeFromJSON(json);

      expect(restored.textContent).toBe("测试序列化");
      expect(restored.type.name).toBe("doc");
    });

    it("带 mark 的文档可正确 JSON 往返", () => {
      const doc = createDocWithMark("bold text", "bold");
      const json = doc.toJSON();
      const restored = editorSchema.nodeFromJSON(json);

      const textNode = restored.content.firstChild!.content.firstChild!;
      expect(textNode.marks).toHaveLength(1);
      expect(textNode.marks[0].type.name).toBe("bold");
    });

    it("heading 节点可正确 JSON 往返", () => {
      const textNode = editorSchema.text("标题文本");
      const heading = editorSchema.nodes.heading.create({ level: 2 }, textNode);
      const doc = editorSchema.nodes.doc.create(null, heading);

      const json = doc.toJSON();
      const restored = editorSchema.nodeFromJSON(json);

      expect(restored.content.firstChild!.type.name).toBe("heading");
      expect(restored.content.firstChild!.attrs.level).toBe(2);
      expect(restored.content.firstChild!.textContent).toBe("标题文本");
    });
  });

  // ── code_block 内联 mark 限制 ─────────────────────────────────

  describe("Code Block — 内联 mark 限制", () => {
    it("code_block 内的 inline mark 不被应用", () => {
      const codeBlockSpec = editorSchema.nodes.code_block.spec;
      // code_block 的 marks 应为空字符串（禁止所有 inline mark）
      expect(codeBlockSpec.marks).toBe("");

      // 验证 code_block 的 code 属性阻止 mark 应用
      const textNode = editorSchema.text("console.log('hi')");
      const codeBlock = editorSchema.nodes.code_block.create(null, textNode);

      // code_block 内文本不应携带 mark
      const innerText = codeBlock.content.firstChild!;
      expect(innerText.marks).toHaveLength(0);
    });
  });

  // ── 选区提取 ──────────────────────────────────────────────────

  describe("Selection Ref — 选区提取", () => {
    it("选中文本 → 生成 SelectionRef { from, to, text, selectionTextHash }", () => {
      const ref = createSelectionRef({
        from: 5,
        to: 10,
        text: "选中的文本",
      });

      expect(ref!.from).toBe(5);
      expect(ref!.to).toBe(10);
      expect(ref!.text).toBe("选中的文本");
      expect(ref!.selectionTextHash).toBeDefined();
      expect(typeof ref!.selectionTextHash).toBe("string");
    });

    it("空选区（from === to 且 text 为空）→ createSelectionRef 返回 null", () => {
      const ref = createSelectionRef({ from: 5, to: 5, text: "" });

      expect(ref).toBeNull();
    });
  });

  // ── selectionTextHash 一致性 ──────────────────────────────────

  describe("Selection Hash — hash 一致性", () => {
    it("相同选中文本 → 相同 hash", () => {
      const hash1 = computeSelectionTextHash("完全相同的文本");
      const hash2 = computeSelectionTextHash("完全相同的文本");

      expect(hash1).toBe(hash2);
    });

    it("不同选中文本 → 不同 hash", () => {
      const hash1 = computeSelectionTextHash("文本A");
      const hash2 = computeSelectionTextHash("文本B");

      expect(hash1).not.toBe(hash2);
    });

    it("修改后的文本 → hash 变化", () => {
      const original = "这是原始文本";
      const modified = "这是修改后文本";

      const hashOrig = computeSelectionTextHash(original);
      const hashMod = computeSelectionTextHash(modified);

      expect(hashOrig).not.toBe(hashMod);
    });

    it("hash 是非空字符串", () => {
      const hash = computeSelectionTextHash("任意文本");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("selectionTextHash 不匹配时 verifySelectionHash 返回 false", () => {
      const ref = createSelectionRef({ from: 0, to: 5, text: "hello" });
      expect(ref).not.toBeNull();
      const isValid = verifySelectionHash(ref!, "modified text");
      expect(isValid).toBe(false);
    });

    it("selectionTextHash 匹配时 verifySelectionHash 返回 true", () => {
      const ref = createSelectionRef({ from: 0, to: 5, text: "hello" });
      expect(ref).not.toBeNull();
      const isValid = verifySelectionHash(ref!, "hello");
      expect(isValid).toBe(true);
    });

    it("空字符串也能生成 hash", () => {
      const hash = computeSelectionTextHash("");
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });
  });
});
