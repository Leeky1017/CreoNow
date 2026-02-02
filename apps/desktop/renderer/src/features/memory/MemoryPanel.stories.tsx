import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { MemoryPanel } from "./MemoryPanel";
import {
  MemoryStoreProvider,
  createMemoryStore,
  type MemoryItem,
  type MemorySettings,
} from "../../stores/memoryStore";
import type { IpcError } from "../../../../../../packages/shared/types/ipc-generated";
import {
  ProjectStoreProvider,
  createProjectStore,
} from "../../stores/projectStore";
import { FileStoreProvider, createFileStore } from "../../stores/fileStore";

// =============================================================================
// Mock 数据：自然语言记忆内容
// =============================================================================

/**
 * 全局记忆：跨所有项目生效
 */
const mockGlobalMemories: MemoryItem[] = [
  {
    memoryId: "g1",
    type: "preference",
    scope: "global",
    origin: "manual",
    content: "我喜欢简洁有力的文风，避免过多形容词堆砌",
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 7,
  },
  {
    memoryId: "g2",
    type: "preference",
    scope: "global",
    origin: "learned",
    content: "对话要自然，不要用书面语，多用口语化表达",
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    memoryId: "g3",
    type: "preference",
    scope: "global",
    origin: "manual",
    content: "每个段落控制在3-5句话，保持阅读节奏",
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    memoryId: "g4",
    type: "fact",
    scope: "global",
    origin: "manual",
    content: "我的笔名是 '墨染青山'",
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 10,
  },
  {
    memoryId: "g5",
    type: "fact",
    scope: "global",
    origin: "manual",
    content: "我主要写都市言情和悬疑推理两个类型",
    createdAt: Date.now() - 86400000 * 8,
    updatedAt: Date.now() - 86400000 * 8,
  },
  {
    memoryId: "g6",
    type: "fact",
    scope: "global",
    origin: "learned",
    content: "我的目标读者群体是 20-35 岁的女性",
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 86400000 * 6,
  },
  {
    memoryId: "g7",
    type: "note",
    scope: "global",
    origin: "manual",
    content: "最近在学习 '冰山理论'，尝试在文字中留白",
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    memoryId: "g8",
    type: "note",
    scope: "global",
    origin: "manual",
    content: "记得查一下民国时期上海的街道名称",
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
];

/**
 * 项目记忆：以"迷雾追凶"悬疑小说为例
 */
const mockProjectMemories: MemoryItem[] = [
  {
    memoryId: "p1",
    type: "preference",
    scope: "project",
    origin: "manual",
    content: "这本书用第一人称叙述，保持主角视角的局限性",
    projectId: "proj-1",
    createdAt: Date.now() - 86400000 * 14,
    updatedAt: Date.now() - 86400000 * 14,
  },
  {
    memoryId: "p2",
    type: "preference",
    scope: "project",
    origin: "learned",
    content: "悬疑线索要埋得深，每三章抛一个新疑点",
    projectId: "proj-1",
    createdAt: Date.now() - 86400000 * 12,
    updatedAt: Date.now() - 86400000 * 12,
  },
  {
    memoryId: "p3",
    type: "preference",
    scope: "project",
    origin: "manual",
    content: "氛围偏暗黑压抑，多用阴雨天气描写",
    projectId: "proj-1",
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 10,
  },
  {
    memoryId: "p4",
    type: "fact",
    scope: "project",
    origin: "manual",
    content: "故事发生在 2024 年的杭州，主要场景是西湖周边",
    projectId: "proj-1",
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 20,
  },
  {
    memoryId: "p5",
    type: "fact",
    scope: "project",
    origin: "manual",
    content: "主角陈默是一名 35 岁的刑警，性格沉稳但有心理创伤",
    projectId: "proj-1",
    createdAt: Date.now() - 86400000 * 18,
    updatedAt: Date.now() - 86400000 * 18,
  },
  {
    memoryId: "p6",
    type: "fact",
    scope: "project",
    origin: "manual",
    content: "死者林雨桐是一名大学教授，专攻古文字研究",
    projectId: "proj-1",
    createdAt: Date.now() - 86400000 * 16,
    updatedAt: Date.now() - 86400000 * 16,
  },
  {
    memoryId: "p7",
    type: "fact",
    scope: "project",
    origin: "learned",
    content: "关键线索是一枚战国时期的青铜印章",
    projectId: "proj-1",
    createdAt: Date.now() - 86400000 * 8,
    updatedAt: Date.now() - 86400000 * 8,
  },
  {
    memoryId: "p8",
    type: "fact",
    scope: "project",
    origin: "manual",
    content: "凶手的动机与 20 年前的一场学术造假有关",
    projectId: "proj-1",
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 86400000 * 6,
  },
  {
    memoryId: "p9",
    type: "note",
    scope: "project",
    origin: "manual",
    content: "第七章需要增加一个误导性嫌疑人",
    projectId: "proj-1",
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 4,
  },
  {
    memoryId: "p10",
    type: "note",
    scope: "project",
    origin: "manual",
    content: "记得在结局前呼应第二章的伏笔",
    projectId: "proj-1",
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    memoryId: "p11",
    type: "note",
    scope: "project",
    origin: "manual",
    content: "下一稿要加强主角与搭档的互动",
    projectId: "proj-1",
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
];

/**
 * 文档记忆：以"第三章：雨夜造访"为例
 */
const mockDocumentMemories: MemoryItem[] = [
  {
    memoryId: "d1",
    type: "preference",
    scope: "document",
    origin: "manual",
    content: "这一章节奏要快，对话密集，推动情节",
    projectId: "proj-1",
    documentId: "doc-1",
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    memoryId: "d2",
    type: "preference",
    scope: "document",
    origin: "learned",
    content: "结尾留一个小悬念，引出下一章",
    projectId: "proj-1",
    documentId: "doc-1",
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    memoryId: "d3",
    type: "fact",
    scope: "document",
    origin: "manual",
    content: "本章出场人物：陈默、林教授的助理小周、神秘来访者",
    projectId: "proj-1",
    documentId: "doc-1",
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    memoryId: "d4",
    type: "fact",
    scope: "document",
    origin: "manual",
    content: "时间线：案发后第三天晚上 10 点",
    projectId: "proj-1",
    documentId: "doc-1",
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 4,
  },
  {
    memoryId: "d5",
    type: "fact",
    scope: "document",
    origin: "learned",
    content: "场景：林教授的书房，外面下着大雨",
    projectId: "proj-1",
    documentId: "doc-1",
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    memoryId: "d6",
    type: "note",
    scope: "document",
    origin: "manual",
    content: "神秘来访者的身份暂时不揭露，用模糊描写",
    projectId: "proj-1",
    documentId: "doc-1",
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
  {
    memoryId: "d7",
    type: "note",
    scope: "document",
    origin: "manual",
    content: "小周的紧张反应要自然，不要太刻意",
    projectId: "proj-1",
    documentId: "doc-1",
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
  },
];

/**
 * 长内容记忆：用于测试文本换行
 */
const mockLongContentMemory: MemoryItem = {
  memoryId: "long-1",
  type: "fact",
  scope: "global",
  origin: "manual",
  content:
    "这个故事的核心主题是关于救赎与原谅。主角陈默在年轻时因为一次判断失误导致搭档牺牲，从此背负着深深的愧疚。整个故事的明线是破案，暗线是陈默逐渐学会原谅自己的过程。最终的高潮不仅仅是抓住凶手，更重要的是陈默终于能够面对过去，与自己和解。这种双线叙事需要在每一章都有所体现，但不能太刻意，要让读者自然感受到角色的内心变化。",
  createdAt: Date.now() - 86400000 * 15,
  updatedAt: Date.now() - 86400000 * 15,
};

/**
 * 默认设置
 */
const defaultSettings: MemorySettings = {
  injectionEnabled: true,
  preferenceLearningEnabled: true,
  privacyModeEnabled: false,
  preferenceLearningThreshold: 3,
};

// =============================================================================
// Mock IPC 和 Wrapper 组件
// =============================================================================

interface MockIpcOptions {
  items: MemoryItem[];
  settings: MemorySettings;
}

function createMockMemoryIpc(options: MockIpcOptions) {
  return {
    invoke: async (channel: string): Promise<unknown> => {
      switch (channel) {
        case "memory:list":
          return { ok: true, data: { items: options.items } };
        case "memory:create":
          return { ok: true, data: { memoryId: `mem-${Date.now()}` } };
        case "memory:delete":
          return { ok: true, data: { deleted: true } };
        case "memory:settings:get":
          return { ok: true, data: options.settings };
        case "memory:settings:update":
          return { ok: true, data: options.settings };
        default:
          return { ok: true, data: {} };
      }
    },
    on: (): (() => void) => () => {},
  };
}

function createMockProjectIpc(projectId: string | null) {
  return {
    invoke: async (channel: string): Promise<unknown> => {
      if (channel === "project:getCurrent" && projectId) {
        return {
          ok: true,
          data: { projectId, rootPath: "/projects/迷雾追凶" },
        };
      }
      if (channel === "project:list") {
        return { ok: true, data: { items: [] } };
      }
      return { ok: false, error: { code: "NOT_FOUND", message: "No project" } };
    },
    on: (): (() => void) => () => {},
  };
}

function createMockFileIpc(documentId: string | null) {
  return {
    invoke: async (channel: string): Promise<unknown> => {
      if (channel === "file:document:getCurrent" && documentId) {
        return { ok: true, data: { documentId } };
      }
      if (channel === "file:document:list") {
        return { ok: true, data: { items: [] } };
      }
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "No document" },
      };
    },
    on: (): (() => void) => () => {},
  };
}

interface MemoryPanelWrapperProps {
  projectId: string | null;
  documentId: string | null;
  items: MemoryItem[];
  settings?: MemorySettings;
  lastError?: IpcError | null;
  bootstrapStatus?: "idle" | "loading" | "ready" | "error";
  width?: number;
  height?: number;
}

function MemoryPanelWrapper(props: MemoryPanelWrapperProps): JSX.Element {
  const {
    projectId,
    documentId,
    items,
    settings = defaultSettings,
    lastError = null,
    bootstrapStatus = "ready",
    width = 320,
    height = 700,
  } = props;

  const [{ memoryStore, projectStore, fileStore }] = React.useState(() => {
    const mockMemoryIpc = createMockMemoryIpc({ items, settings });
    const mockProjectIpc = createMockProjectIpc(projectId);
    const mockFileIpc = createMockFileIpc(documentId);

    return {
      memoryStore: createMemoryStore(
        mockMemoryIpc as Parameters<typeof createMemoryStore>[0],
      ),
      projectStore: createProjectStore(
        mockProjectIpc as Parameters<typeof createProjectStore>[0],
      ),
      fileStore: createFileStore(
        mockFileIpc as Parameters<typeof createFileStore>[0],
      ),
    };
  });

  // 初始化 store 状态
  React.useEffect(() => {
    memoryStore.setState({
      projectId,
      documentId,
      items,
      settings,
      bootstrapStatus,
      lastError,
    });

    if (projectId) {
      projectStore.setState({
        current: { projectId, rootPath: "/projects/迷雾追凶" },
        bootstrapStatus: "ready",
      });
    } else {
      projectStore.setState({
        current: null,
        bootstrapStatus: "ready",
      });
    }

    fileStore.setState({
      projectId,
      currentDocumentId: documentId,
      bootstrapStatus: "ready",
    });
  }, [
    memoryStore,
    projectStore,
    fileStore,
    projectId,
    documentId,
    items,
    settings,
    bootstrapStatus,
    lastError,
  ]);

  return (
    <ProjectStoreProvider store={projectStore}>
      <FileStoreProvider store={fileStore}>
        <MemoryStoreProvider store={memoryStore}>
          <div
            style={{
              width,
              height,
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-md)",
              overflow: "auto",
            }}
          >
            <MemoryPanel />
          </div>
        </MemoryStoreProvider>
      </FileStoreProvider>
    </ProjectStoreProvider>
  );
}

// =============================================================================
// Meta 配置
// =============================================================================

/**
 * MemoryPanel 组件 Story
 *
 * 记忆面板功能：
 * - 三层记忆层级：全局 → 项目 → 文档
 * - 记忆类型：偏好 (preference) / 事实 (fact) / 笔记 (note)
 * - CRUD 操作：添加、查看、删除记忆
 * - 设置管理：通过齿轮图标打开设置对话框
 *
 * UI 布局：
 * - 顶部：标题 + 齿轮设置按钮
 * - Scope tabs：Global | Project | Document
 * - 主体：记忆列表（flex-1 占满）
 * - 底部：简化的添加区域
 */
const meta: Meta<typeof MemoryPanel> = {
  title: "Features/MemoryPanel",
  component: MemoryPanel,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof MemoryPanel>;

// =============================================================================
// 第一组：上下文层级（展示三层记忆的启用/禁用逻辑）
// =============================================================================

/**
 * 无项目上下文
 *
 * 场景：用户刚打开应用，还没有打开任何项目
 *
 * 展示效果：
 * - Global tab 高亮可点击
 * - Project tab 灰色禁用
 * - Document tab 灰色禁用
 * - 显示全局记忆
 * - 新添加的记忆自动归属 global 层级
 */
export const GlobalOnly: Story = {
  render: () => (
    <MemoryPanelWrapper
      projectId={null}
      documentId={null}
      items={mockGlobalMemories.slice(0, 4)}
    />
  ),
};

/**
 * 有项目无文档
 *
 * 场景：用户打开了"迷雾追凶"项目，但没有打开具体章节
 *
 * 展示效果：
 * - Global tab 可点击
 * - Project tab 可点击
 * - Document tab 灰色禁用
 * - 显示全局和项目记忆
 * - 新添加的记忆自动归属当前选中的层级
 */
export const WithProject: Story = {
  render: () => (
    <MemoryPanelWrapper
      projectId="proj-1"
      documentId={null}
      items={[
        ...mockGlobalMemories.slice(0, 3),
        ...mockProjectMemories.slice(0, 5),
      ]}
    />
  ),
};

/**
 * 完整上下文
 *
 * 场景：用户正在编辑"第三章：雨夜造访"
 *
 * 展示效果：
 * - 三个 tab 都可点击
 * - 显示三层记忆
 * - 新添加的记忆自动归属当前选中的层级
 */
export const WithDocument: Story = {
  render: () => (
    <MemoryPanelWrapper
      projectId="proj-1"
      documentId="doc-1"
      items={[
        ...mockGlobalMemories.slice(0, 3),
        ...mockProjectMemories.slice(0, 4),
        ...mockDocumentMemories.slice(0, 4),
      ]}
    />
  ),
};

// =============================================================================
// 第二组：记忆列表展示
// =============================================================================

/**
 * 空状态
 *
 * 场景：新用户，还没有任何记忆
 *
 * 展示效果：
 * - Items 区域显示 "No global memories yet."
 * - 提示用户可以添加记忆
 */
export const Empty: Story = {
  render: () => (
    <MemoryPanelWrapper projectId={null} documentId={null} items={[]} />
  ),
};

/**
 * 典型状态
 *
 * 场景：正常使用的用户，有一些记忆
 *
 * 展示效果：
 * - 显示 5 条记忆，混合不同类型
 * - 每条记忆显示：类型标签、来源标签、内容、删除按钮
 * - 列表可滚动
 */
export const WithMemories: Story = {
  render: () => (
    <MemoryPanelWrapper
      projectId={null}
      documentId={null}
      items={mockGlobalMemories.slice(0, 5)}
    />
  ),
};

/**
 * 大量记忆
 *
 * 场景：重度用户，积累了很多记忆
 *
 * 展示效果：
 * - 显示 20+ 条记忆
 * - 验证滚动性能
 * - 验证列表不会卡顿
 */
export const ManyMemories: Story = {
  render: () => {
    // 生成更多记忆用于测试滚动
    const manyItems: MemoryItem[] = [];
    for (let i = 0; i < 25; i++) {
      manyItems.push({
        memoryId: `many-${i}`,
        type: ["preference", "fact", "note"][i % 3] as MemoryItem["type"],
        scope: "global",
        origin: i % 2 === 0 ? "manual" : "learned",
        content: `这是第 ${i + 1} 条记忆，用于测试大量记忆时的滚动性能和列表渲染效果。`,
        createdAt: Date.now() - 86400000 * (25 - i),
        updatedAt: Date.now() - 86400000 * (25 - i),
      });
    }
    return (
      <MemoryPanelWrapper
        projectId={null}
        documentId={null}
        items={manyItems}
      />
    );
  },
};

/**
 * 长内容记忆
 *
 * 场景：用户写了很长的记忆内容
 *
 * 展示效果：
 * - 包含一条 200+ 字的长记忆
 * - 验证文本换行正确
 * - 验证不会撑破卡片布局
 */
export const LongContent: Story = {
  render: () => (
    <MemoryPanelWrapper
      projectId={null}
      documentId={null}
      items={[mockLongContentMemory, ...mockGlobalMemories.slice(0, 3)]}
    />
  ),
};

// =============================================================================
// 第三组：层级切换与过滤
// =============================================================================

/**
 * 项目记忆展示
 *
 * 场景：用户切换到 Project tab 查看项目专属记忆
 *
 * 展示效果：
 * - Project tab 高亮
 * - 显示 "迷雾追凶" 项目的记忆
 * - 列表标题显示过滤后的数量
 */
export const ProjectMemories: Story = {
  render: () => (
    <MemoryPanelWrapper
      projectId="proj-1"
      documentId={null}
      items={[...mockGlobalMemories.slice(0, 4), ...mockProjectMemories]}
    />
  ),
};

/**
 * 文档记忆展示
 *
 * 场景：用户切换到 Document tab 查看当前章节记忆
 *
 * 展示效果：
 * - Document tab 高亮
 * - 显示当前章节的记忆
 * - 内容都与"第三章"相关
 */
export const DocumentMemories: Story = {
  render: () => (
    <MemoryPanelWrapper
      projectId="proj-1"
      documentId="doc-1"
      items={[
        ...mockGlobalMemories.slice(0, 3),
        ...mockProjectMemories.slice(0, 4),
        ...mockDocumentMemories,
      ]}
    />
  ),
};

/**
 * 混合层级展示
 *
 * 场景：展示三层都有数据的情况
 *
 * 展示效果：
 * - 三个 tab 都有数据
 * - Global: 4 条, Project: 5 条, Document: 3 条
 * - 切换时列表内容变化
 */
export const MixedScopes: Story = {
  render: () => (
    <MemoryPanelWrapper
      projectId="proj-1"
      documentId="doc-1"
      items={[
        ...mockGlobalMemories.slice(0, 4),
        ...mockProjectMemories.slice(0, 5),
        ...mockDocumentMemories.slice(0, 3),
      ]}
    />
  ),
};

// =============================================================================
// 第四组：记忆类型展示
// =============================================================================

/**
 * 偏好类记忆
 *
 * 场景：展示"偏好"类型的典型用法
 *
 * 展示效果：
 * - 只显示 preference 类型的记忆
 * - 内容都是写作风格偏好
 * - 每条显示 "preference" 标签
 */
export const PreferencesDemo: Story = {
  render: () => {
    const preferences = mockGlobalMemories.filter(
      (m) => m.type === "preference",
    );
    return (
      <MemoryPanelWrapper
        projectId={null}
        documentId={null}
        items={preferences}
      />
    );
  },
};

/**
 * 事实类记忆
 *
 * 场景：展示"事实"类型的典型用法
 *
 * 展示效果：
 * - 只显示 fact 类型的记忆
 * - 内容都是角色设定、世界观等客观信息
 * - 每条显示 "fact" 标签
 */
export const FactsDemo: Story = {
  render: () => {
    const facts = [
      ...mockGlobalMemories.filter((m) => m.type === "fact"),
      ...mockProjectMemories.filter((m) => m.type === "fact").slice(0, 3),
    ];
    // 把 project facts 改为 global scope 用于展示
    const globalFacts = facts.map((m) => ({
      ...m,
      scope: "global" as const,
      projectId: undefined,
    }));
    return (
      <MemoryPanelWrapper
        projectId={null}
        documentId={null}
        items={globalFacts}
      />
    );
  },
};

/**
 * 笔记类记忆
 *
 * 场景：展示"笔记"类型的典型用法
 *
 * 展示效果：
 * - 只显示 note 类型的记忆
 * - 内容都是临时提醒、待办事项
 * - 每条显示 "note" 标签
 */
export const NotesDemo: Story = {
  render: () => {
    const notes = [
      ...mockGlobalMemories.filter((m) => m.type === "note"),
      ...mockProjectMemories.filter((m) => m.type === "note").slice(0, 2),
    ];
    // 把 project notes 改为 global scope 用于展示
    const globalNotes = notes.map((m) => ({
      ...m,
      scope: "global" as const,
      projectId: undefined,
    }));
    return (
      <MemoryPanelWrapper
        projectId={null}
        documentId={null}
        items={globalNotes}
      />
    );
  },
};

// =============================================================================
// 第五组：功能场景
// =============================================================================

/**
 * 错误状态
 *
 * 场景：操作失败时的错误提示
 *
 * 展示效果：
 * - 顶部显示错误卡片
 * - 错误码: "INTERNAL"
 * - 错误信息："无法保存记忆，请检查网络连接后重试"
 * - 有 "Dismiss" 按钮可关闭
 */
export const ErrorState: Story = {
  render: () => (
    <MemoryPanelWrapper
      projectId={null}
      documentId={null}
      items={mockGlobalMemories.slice(0, 3)}
      lastError={{
        code: "INTERNAL",
        message: "无法保存记忆，请检查网络连接后重试",
      }}
    />
  ),
};

/**
 * 带齿轮按钮
 *
 * 场景：展示齿轮设置按钮
 *
 * 展示效果：
 * - 右上角显示齿轮图标
 * - 点击齿轮打开 MemorySettingsDialog
 * - 设置详情见 MemorySettingsDialog stories
 */
export const WithSettingsButton: Story = {
  render: () => (
    <MemoryPanelWrapper
      projectId={null}
      documentId={null}
      items={mockGlobalMemories.slice(0, 4)}
    />
  ),
};
