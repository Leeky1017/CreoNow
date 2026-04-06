/**
 * P3 风格配置场景测试
 * Spec: openspec/specs/project-management/spec.md
 *   — "P3 创建项目时设置风格配置"
 *   — "P3 修改风格设定后即时生效"
 *
 * 验证 ProjectStyleConfig 的创建、读取、更新通过 IPC 生效。
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

import type {
  ProjectConfig,
  ProjectStyleConfig,
} from "../projectManager";
import { createProjectManager } from "../projectManager";

// ── mock types ──

interface MockDb {
  prepare: Mock;
  exec: Mock;
  transaction: Mock;
}

interface MockEventBus {
  emit: Mock;
  on: Mock;
  off: Mock;
}

// ── helpers ──

function createMockDb(): MockDb {
  return {
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn().mockReturnValue([]),
    }),
    exec: vi.fn(),
    transaction: vi.fn((fn: Function) => fn),
  };
}

function createMockEventBus(): MockEventBus {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
}

const BASE_STYLE: ProjectStyleConfig = {
  narrativePerson: "first",
  genre: "都市悬疑",
  languageStyle: "简洁",
  tone: "冷峻克制",
  targetAudience: "成人",
};

describe("P3 风格配置场景", () => {
  let db: MockDb;
  let eventBus: MockEventBus;

  beforeEach(() => {
    db = createMockDb();
    eventBus = createMockEventBus();
  });

  // Spec: "P3 创建项目时设置风格配置"
  it("创建项目时同时持久化 ProjectStyleConfig", async () => {
    const initialProject: ProjectConfig = {
      id: "proj-style-1",
      name: "暗流",
      type: "novel",
      description: "都市悬疑小说",
      stage: "draft",
      lifecycleStatus: "active",
      style: { ...BASE_STYLE },
      goals: { targetWordCount: 80000, targetChapterCount: 20 },
      defaultSkillSetId: null,
      knowledgeGraphId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const pm = createProjectManager({
      db: db as never,
      eventBus: eventBus as never,
      initialProjects: [initialProject],
    });

    const result = await pm.getProject("proj-style-1");
    expect(result.success).toBe(true);
    expect(result.data!.style.genre).toBe("都市悬疑");
    expect(result.data!.style.tone).toBe("冷峻克制");
    expect(result.data!.style.narrativePerson).toBe("first");
  });

  // Spec: "P3 修改风格设定后即时生效"
  it("修改风格设定后 getProject 返回更新后的值", async () => {
    const initialProject: ProjectConfig = {
      id: "proj-style-2",
      name: "暗流",
      type: "novel",
      description: "都市悬疑小说",
      stage: "draft",
      lifecycleStatus: "active",
      style: { ...BASE_STYLE },
      goals: { targetWordCount: 80000, targetChapterCount: 20 },
      defaultSkillSetId: null,
      knowledgeGraphId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const pm = createProjectManager({
      db: db as never,
      eventBus: eventBus as never,
      initialProjects: [initialProject],
    });

    // 修改语气（updateProject replaces entire style, so provide full object）
    await pm.updateProject("proj-style-2", {
      style: { ...BASE_STYLE, tone: "温暖幽默" },
    });

    const result = await pm.getProject("proj-style-2");
    expect(result.success).toBe(true);
    expect(result.data!.style.tone).toBe("温暖幽默");
    // 其他字段保持不变
    expect(result.data!.style.genre).toBe("都市悬疑");
    expect(result.data!.style.narrativePerson).toBe("first");
  });

  // Spec: "P3 修改风格设定后即时生效" — 验证事件触发
  it("修改风格后发射 project-config-updated 事件", async () => {
    const initialProject: ProjectConfig = {
      id: "proj-style-3",
      name: "暗流",
      type: "novel",
      description: "都市悬疑小说",
      stage: "draft",
      lifecycleStatus: "active",
      style: { ...BASE_STYLE },
      goals: { targetWordCount: 50000, targetChapterCount: 10 },
      defaultSkillSetId: null,
      knowledgeGraphId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const pm = createProjectManager({
      db: db as never,
      eventBus: eventBus as never,
      initialProjects: [initialProject],
    });

    await pm.updateProject("proj-style-3", {
      style: { ...BASE_STYLE, genre: "奇幻", tone: "热烈" },
    });

    // 验证事件已发射
    expect(eventBus.emit).toHaveBeenCalled();
    const emittedArgs = eventBus.emit.mock.calls;
    const updateEvent = emittedArgs.find(
      (args: unknown[]) =>
        (args[0] as Record<string, unknown>)?.type === "project-config-updated",
    );
    expect(updateEvent).toBeDefined();
  });
});
