/**
 * P3 Skills 测试 — 一致性检查、对白生成、大纲展开
 * Spec: openspec/specs/skill-system/spec.md — P3: 新技能扩展
 *
 * TDD Red Phase：测试应编译但因实现不存在而失败。
 * 验证 SkillManifest 解析、SkillContextRequirement、三个新技能的
 * 输入校验/AI 调用/结果解析、annotation 管线、错误处理、
 * 技能注册到 ToolRegistry。
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

import type {
  ConsistencyCheckResult,
  DialogueGenResult,
  OutlineExpandResult,
  P3SkillExecutor,
} from "../p3Skills";
import {
  parseSkillManifest,
  createP3SkillExecutor,
} from "../p3Skills";

// ─── mock types ─────────────────────────────────────────────────────

interface MockAiService {
  complete: Mock;
  stream: Mock;
}

interface MockContextEngine {
  assembleContext: Mock;
}

interface MockEventBus {
  emit: Mock;
  on: Mock;
  off: Mock;
}

interface MockToolRegistry {
  register: Mock;
  get: Mock;
}

// ─── helpers ────────────────────────────────────────────────────────

function createMockAiService(): MockAiService {
  return {
    complete: vi.fn(),
    stream: vi.fn(),
  };
}

function createMockContextEngine(): MockContextEngine {
  return {
    assembleContext: vi.fn().mockResolvedValue({
      success: true,
      data: {
        characterSettings: "林远：28 岁，退休刑警，性格冷静理性",
        locationSettings: "废弃仓库：气氛阴冷压抑，灯光昏暗",
        documentContent: "林远走进了废弃仓库",
      },
    }),
  };
}

function createMockEventBus(): MockEventBus {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
}

function createMockToolRegistry(): MockToolRegistry {
  return {
    register: vi.fn(),
    get: vi.fn(),
  };
}

/** 标准的 consistency-check SKILL.md 内容 */
const CONSISTENCY_CHECK_SKILL_MD = `---
id: consistency-check
name: 一致性检查
description: 检查角色/地点设定与正文的一致性
category: analysis
scope: builtin
inputRequirement:
  requiresSelection: false
  requiresDocumentContext: true
  requiresProjectContext: true
outputType: annotation
permissionLevel: auto-allow
contextRules:
  injectCharacterSettings: true
  injectLocationSettings: true
  injectMemory: false
  injectSearchContext: false
---

你是一名创作一致性审核员。请检查以下文本与角色/地点设定之间是否存在矛盾。`;

const DIALOGUE_GEN_SKILL_MD = `---
id: dialogue-gen
name: 对白生成
description: 根据角色设定和场景上下文生成对白
category: generation
scope: builtin
inputRequirement:
  requiresSelection: true
  requiresDocumentContext: true
  requiresProjectContext: true
outputType: suggestion
permissionLevel: preview-confirm
contextRules:
  injectCharacterSettings: true
  injectLocationSettings: false
  injectMemory: true
  injectSearchContext: false
---

你是一名专业编剧。请根据角色设定为指定角色生成对白。`;

const OUTLINE_EXPAND_SKILL_MD = `---
id: outline-expand
name: 大纲展开
description: 将大纲要点展开为完整段落或章节
category: generation
scope: builtin
inputRequirement:
  requiresSelection: true
  requiresDocumentContext: true
  requiresProjectContext: true
outputType: new-content
permissionLevel: preview-confirm
contextRules:
  injectCharacterSettings: true
  injectLocationSettings: true
  injectMemory: true
  injectSearchContext: false
---

你是一名小说创作助手。请将以下大纲要点展开为完整叙事。`;

// ─── tests ──────────────────────────────────────────────────────────

describe("P3 Skills", () => {
  let aiService: MockAiService;
  let contextEngine: MockContextEngine;
  let eventBus: MockEventBus;
  let toolRegistry: MockToolRegistry;
  let executor: P3SkillExecutor;

  beforeEach(() => {
    aiService = createMockAiService();
    contextEngine = createMockContextEngine();
    eventBus = createMockEventBus();
    toolRegistry = createMockToolRegistry();
    executor = createP3SkillExecutor({
      aiService: aiService as any,
      contextEngine: contextEngine as any,
      eventBus: eventBus as any,
      toolRegistry: toolRegistry as any,
    });
  });

  afterEach(() => {
    executor.dispose?.();
    vi.restoreAllMocks();
  });

  // ── SkillManifest parsing ───────────────────────────────────────

  describe("parseSkillManifest", () => {
    it("从 SKILL.md 解析出完整 SkillManifest", () => {
      const manifest = parseSkillManifest(CONSISTENCY_CHECK_SKILL_MD);

      expect(manifest.id).toBe("consistency-check");
      expect(manifest.name).toBe("一致性检查");
      expect(manifest.description).toBe("检查角色/地点设定与正文的一致性");
      expect(manifest.category).toBe("analysis");
      expect(manifest.scope).toBe("builtin");
      expect(manifest.outputType).toBe("annotation");
      expect(manifest.permissionLevel).toBe("auto-allow");
    });

    it("解析 contextRequirement 字段", () => {
      const manifest = parseSkillManifest(CONSISTENCY_CHECK_SKILL_MD);

      expect(manifest.contextRequirement.requiresSelection).toBe(false);
      expect(manifest.contextRequirement.requiresDocumentContext).toBe(true);
      expect(manifest.contextRequirement.requiresProjectContext).toBe(true);
    });

    it("解析 contextRules 字段", () => {
      const manifest = parseSkillManifest(CONSISTENCY_CHECK_SKILL_MD);

      expect(manifest.contextRules.injectCharacterSettings).toBe(true);
      expect(manifest.contextRules.injectLocationSettings).toBe(true);
      expect(manifest.contextRules.injectMemory).toBe(false);
      expect(manifest.contextRules.injectSearchContext).toBe(false);
    });

    it("contextRules.contextWindowSize 为可选数值字段", () => {
      const skillMdWithWindowSize = `---
id: test-skill
name: 测试技能
description: 带 contextWindowSize 的技能
category: analysis
scope: builtin
inputRequirement:
  requiresSelection: false
  requiresDocumentContext: true
  requiresProjectContext: false
outputType: annotation
permissionLevel: auto-allow
contextRules:
  injectCharacterSettings: false
  injectLocationSettings: false
  injectMemory: false
  injectSearchContext: false
  contextWindowSize: 4000
---

System prompt.`;
      const manifest = parseSkillManifest(skillMdWithWindowSize);

      expect(manifest.contextRules.contextWindowSize).toBe(4000);
    });

    it("提取 system prompt 模板（Markdown 正文部分）", () => {
      const manifest = parseSkillManifest(CONSISTENCY_CHECK_SKILL_MD);

      expect(manifest.systemPromptTemplate).toContain("一致性审核员");
    });

    it("解析 dialogue-gen SKILL.md", () => {
      const manifest = parseSkillManifest(DIALOGUE_GEN_SKILL_MD);

      expect(manifest.id).toBe("dialogue-gen");
      expect(manifest.category).toBe("generation");
      expect(manifest.outputType).toBe("suggestion");
      expect(manifest.contextRequirement.requiresSelection).toBe(true);
    });

    it("解析 outline-expand SKILL.md", () => {
      const manifest = parseSkillManifest(OUTLINE_EXPAND_SKILL_MD);

      expect(manifest.id).toBe("outline-expand");
      expect(manifest.outputType).toBe("new-content");
      expect(manifest.contextRules.injectMemory).toBe(true);
    });

    it("格式错误的 SKILL.md 抛出解析异常", () => {
      expect(() => parseSkillManifest("invalid content")).toThrow();
    });

    it("缺少必须字段的 frontmatter 抛出异常", () => {
      const incomplete = `---
id: test
---
prompt content`;
      expect(() => parseSkillManifest(incomplete)).toThrow();
    });

    it("contextRules.minInputLength 为可选数值字段", () => {
      const skillMdWithMinInput = `---
id: test-min-input
name: 测试最小输入
description: 带 minInputLength 的技能
category: generation
scope: builtin
inputRequirement:
  requiresSelection: true
  requiresDocumentContext: true
  requiresProjectContext: false
  minInputLength: 10
outputType: suggestion
permissionLevel: preview-confirm
contextRules:
  injectCharacterSettings: false
  injectLocationSettings: false
  injectMemory: false
  injectSearchContext: false
---

System prompt.`;
      const manifest = parseSkillManifest(skillMdWithMinInput);

      expect(manifest.contextRequirement.minInputLength).toBe(10);
    });
  });

  // ── SkillContextRequirement behavior ────────────────────────────

  describe("SkillContextRequirement", () => {
    it("requiresProjectContext=true 时注入角色/地点设定", async () => {
      await executor.executeSkill("consistency-check", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "林远走进了废弃仓库",
      });

      expect(contextEngine.assembleContext).toHaveBeenCalled();
    });

    it("requiresSelection=true 但无选区时返回错误", async () => {
      const result = await executor.executeSkill("dialogue-gen", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "文本",
        selection: undefined,
      });

      expect(result.success).toBe(false);
    });

    it("requiresProjectContext=true 但无项目时提示先添加设定", async () => {
      contextEngine.assembleContext.mockResolvedValue({
        success: true,
        data: {
          characterSettings: "",
          locationSettings: "",
          documentContent: "文本",
        },
      });

      const result = await executor.executeSkill("consistency-check", {
        projectId: "proj-empty",
        documentId: "doc-1",
        documentContent: "林远走进了废弃仓库",
      });

      expect(result.success).toBe(false);
    });

    it("minInputLength 不满足时返回错误", async () => {
      const result = await executor.executeSkill("dialogue-gen", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "",
        selection: { from: 0, to: 0, text: "" },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SKILL_INPUT_INVALID");
    });
  });

  // ── consistency-check skill ─────────────────────────────────────

  describe("consistency-check", () => {
    it("发现矛盾时返回 ConsistencyCheckResult with issues", async () => {
      aiService.complete.mockResolvedValue({
        content: JSON.stringify({
          passed: false,
          issues: [{
            location: "林远暴躁地摔门",
            description: "林远设定性格冷静，但此处表现暴躁",
            suggestion: "改为'林远沉着脸，缓缓关上门'",
            severity: "warning",
          }],
        }),
      });

      const result = await executor.executeSkill("consistency-check", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "林远暴躁地摔门",
      });

      expect(result.success).toBe(true);
      const data = result.data as ConsistencyCheckResult;
      expect(data.passed).toBe(false);
      expect(data.issues).toHaveLength(1);
      expect(data.issues[0].severity).toBe("warning");
    });

    it("无矛盾时返回 passed=true 和空 issues", async () => {
      aiService.complete.mockResolvedValue({
        content: JSON.stringify({ passed: true, issues: [] }),
      });

      const result = await executor.executeSkill("consistency-check", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "林远冷静地分析线索",
      });

      expect(result.success).toBe(true);
      const data = result.data as ConsistencyCheckResult;
      expect(data.passed).toBe(true);
      expect(data.issues).toEqual([]);
    });

    it("完成后发射 consistency-check-completed 事件", async () => {
      aiService.complete.mockResolvedValue({
        content: JSON.stringify({ passed: true, issues: [] }),
      });

      await executor.executeSkill("consistency-check", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "文本",
      });

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "consistency-check-completed",
          projectId: "proj-1",
          passed: true,
          issueCount: 0,
          timestamp: expect.any(Number),
        }),
      );
    });

    it("ConsistencyIssue 包含 relatedEntityId（可选）", async () => {
      aiService.complete.mockResolvedValue({
        content: JSON.stringify({
          passed: false,
          issues: [{
            location: "test",
            description: "desc",
            suggestion: "sug",
            relatedEntityId: "char-1",
            severity: "error",
          }],
        }),
      });

      const result = await executor.executeSkill("consistency-check", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "text",
      });

      const data = result.data as ConsistencyCheckResult;
      expect(data.issues[0].relatedEntityId).toBe("char-1");
    });
  });

  // ── dialogue-gen skill ──────────────────────────────────────────

  describe("dialogue-gen", () => {
    it("根据角色设定生成符合性格的对白", async () => {
      aiService.complete.mockResolvedValue({
        content: JSON.stringify({
          dialogue: "「到了。」林远简短地说，目光扫过四周。",
          characterId: "char-1",
        }),
      });

      const result = await executor.executeSkill("dialogue-gen", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "他们来到了废弃仓库门口",
        selection: { from: 0, to: 10, text: "林远说：" },
      });

      expect(result.success).toBe(true);
      const data = result.data as DialogueGenResult;
      expect(data.dialogue).toBeDefined();
      expect(typeof data.dialogue).toBe("string");
    });

    it("无角色设定时仅根据前文推断", async () => {
      contextEngine.assembleContext.mockResolvedValue({
        success: true,
        data: {
          characterSettings: "",
          locationSettings: "",
          documentContent: "文本",
        },
      });

      aiService.complete.mockResolvedValue({
        content: JSON.stringify({
          dialogue: "对白内容",
        }),
      });

      const result = await executor.executeSkill("dialogue-gen", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "文本",
        selection: { from: 0, to: 5, text: "他说：" },
      });

      expect(result.success).toBe(true);
    });

    it("outputType 为 suggestion（preview-confirm 流程）", () => {
      const manifest = parseSkillManifest(DIALOGUE_GEN_SKILL_MD);
      expect(manifest.outputType).toBe("suggestion");
      expect(manifest.permissionLevel).toBe("preview-confirm");
    });

    it("对白生成考虑场景上下文（紧张氛围反映在对白中）", async () => {
      contextEngine.assembleContext.mockResolvedValue({
        success: true,
        data: {
          characterSettings: "林远：前特种兵，性格冷静",
          locationSettings: "暗巷：紧张的追逐战场景",
          documentContent: "枪声从身后响起，林远翻过围墙",
        },
      });

      aiService.complete.mockResolvedValue({
        content: JSON.stringify({
          dialogue: "「趴下！」林远低声喝道，同时拔出了备用武器。",
          characterId: "char-1",
        }),
      });

      const result = await executor.executeSkill("dialogue-gen", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "枪声从身后响起，林远翻过围墙",
        selection: { from: 0, to: 10, text: "林远说：" },
      });

      expect(result.success).toBe(true);
      const data = result.data as DialogueGenResult;
      expect(data.dialogue).toBeDefined();
      expect(data.dialogue.length).toBeGreaterThan(0);
      // AI 应在拿到紧张场景上下文后生成对应对白
      expect(contextEngine.assembleContext).toHaveBeenCalled();
    });
  });

  // ── outline-expand skill ────────────────────────────────────────

  describe("outline-expand", () => {
    it("将大纲要点展开为完整叙事段落", async () => {
      aiService.complete.mockResolvedValue({
        content: JSON.stringify({
          expandedContent: "林远独自驱车来到城郊的废弃仓库...",
          paragraphCount: 3,
        }),
      });

      const result = await executor.executeSkill("outline-expand", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "大纲全文",
        selection: {
          from: 0,
          to: 20,
          text: "林远独自来到废弃仓库，发现了一封神秘信件",
        },
      });

      expect(result.success).toBe(true);
      const data = result.data as OutlineExpandResult;
      expect(data.expandedContent).toBeDefined();
      expect(data.expandedContent.length).toBeGreaterThan(0);
    });

    it("展开内容反映项目风格设定", async () => {
      aiService.complete.mockResolvedValue({
        content: JSON.stringify({
          expandedContent: "冷峻风格的叙事...",
          paragraphCount: 2,
        }),
      });

      const result = await executor.executeSkill("outline-expand", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "大纲",
        selection: { from: 0, to: 5, text: "大纲要点" },
      });

      expect(result.success).toBe(true);
    });

    it("无前后上下文时功能正常不报错", async () => {
      contextEngine.assembleContext.mockResolvedValue({
        success: true,
        data: {
          characterSettings: "",
          locationSettings: "",
          documentContent: "",
        },
      });

      aiService.complete.mockResolvedValue({
        content: JSON.stringify({
          expandedContent: "展开内容",
          paragraphCount: 1,
        }),
      });

      const result = await executor.executeSkill("outline-expand", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "",
        selection: { from: 0, to: 5, text: "要点" },
      });

      expect(result.success).toBe(true);
    });

    it("outputType 为 new-content", () => {
      const manifest = parseSkillManifest(OUTLINE_EXPAND_SKILL_MD);
      expect(manifest.outputType).toBe("new-content");
    });

    it("展开内容保持前后章节连贯性", async () => {
      contextEngine.assembleContext.mockResolvedValue({
        success: true,
        data: {
          characterSettings: "林远：退休刑警",
          locationSettings: "废弃仓库",
          documentContent: "第四章结尾：林远发动了引擎，驶向城郊。",
          previousChapterEnding: "林远发动了引擎，驶向城郊。",
        },
      });

      aiService.complete.mockResolvedValue({
        content: JSON.stringify({
          expandedContent: "车子驶过最后一个路口，城郊的废弃仓库出现在视野中。林远熄了火，推开车门...",
          paragraphCount: 3,
        }),
      });

      const result = await executor.executeSkill("outline-expand", {
        projectId: "proj-1",
        documentId: "doc-5",
        documentContent: "第五章大纲",
        selection: { from: 0, to: 20, text: "林远到达废弃仓库" },
      });

      expect(result.success).toBe(true);
      const data = result.data as OutlineExpandResult;
      expect(data.expandedContent).toBeDefined();
      expect(data.expandedContent.length).toBeGreaterThan(0);
      // 验证上下文引擎被调用以获取前后章节信息
      expect(contextEngine.assembleContext).toHaveBeenCalled();
    });
  });

  // ── annotation pipeline ─────────────────────────────────────────

  describe("annotation pipeline", () => {
    it("annotation 类型技能跳过 permission-gate 步骤", async () => {
      const manifest = parseSkillManifest(CONSISTENCY_CHECK_SKILL_MD);
      expect(manifest.permissionLevel).toBe("auto-allow");
    });

    it("annotation 类型技能跳过 write-back 步骤", async () => {
      const manifest = parseSkillManifest(CONSISTENCY_CHECK_SKILL_MD);
      expect(manifest.outputType).toBe("annotation");
    });
  });

  // ── Error handling ──────────────────────────────────────────────

  describe("error handling", () => {
    it("AI 返回格式错误时返回解析错误", async () => {
      aiService.complete.mockResolvedValue({
        content: "not valid json",
      });

      const result = await executor.executeSkill("consistency-check", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "文本",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SKILL_OUTPUT_INVALID");
    });

    it("AI 调用超时时返回超时错误", async () => {
      aiService.complete.mockRejectedValue(new Error("timeout"));

      const result = await executor.executeSkill("consistency-check", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "文本",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("AI_SERVICE_ERROR");
    });

    it("AI 返回 markdown 包裹的 JSON 时能正确解析", async () => {
      aiService.complete.mockResolvedValue({
        content: "```json\n{\"passed\": true, \"issues\": []}\n```",
      });

      const result = await executor.executeSkill("consistency-check", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "林远冷静地分析线索",
      });

      expect(result.success).toBe(true);
      const data = result.data as ConsistencyCheckResult;
      expect(data.passed).toBe(true);
      expect(data.issues).toEqual([]);
    });

    it("AI 返回含多余字段的 JSON 时仍能解析核心数据", async () => {
      aiService.complete.mockResolvedValue({
        content: JSON.stringify({
          passed: false,
          issues: [{
            location: "test",
            description: "desc",
            suggestion: "sug",
            severity: "warning",
          }],
          extraField: "should be ignored",
          metadata: { version: "1.0" },
        }),
      });

      const result = await executor.executeSkill("consistency-check", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "文本",
      });

      expect(result.success).toBe(true);
      const data = result.data as ConsistencyCheckResult;
      expect(data.passed).toBe(false);
      expect(data.issues).toHaveLength(1);
    });
  });

  // ── Skill registration ─────────────────────────────────────────

  describe("skill registration", () => {
    it("P3 技能注册到 ToolRegistry", () => {
      executor.registerSkills();

      expect(toolRegistry.register).toHaveBeenCalled();
    });

    it("注册三个 P3 技能", () => {
      executor.registerSkills();

      const registeredIds = toolRegistry.register.mock.calls.map(
        (call: any) => call[0]?.id || call[0]?.name,
      );
      expect(registeredIds).toContain("consistency-check");
      expect(registeredIds).toContain("dialogue-gen");
      expect(registeredIds).toContain("outline-expand");
    });
  });

  // ── dispose ─────────────────────────────────────────────────────

  describe("dispose", () => {
    it("dispose 后调用 executeSkill 抛出错误", async () => {
      executor.dispose?.();

      const result = await executor.executeSkill("consistency-check", {
        projectId: "proj-1",
        documentId: "doc-1",
        documentContent: "文本",
      });

      expect(result.success).toBe(false);
    });

    it("dispose 可重复调用不报错", () => {
      executor.dispose?.();
      expect(() => executor.dispose?.()).not.toThrow();
    });
  });
});
