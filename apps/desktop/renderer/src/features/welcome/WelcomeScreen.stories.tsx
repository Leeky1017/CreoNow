import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { create } from "zustand";
import { WelcomeScreen } from "./WelcomeScreen";
import {
  ProjectStoreProvider,
  type ProjectStore,
} from "../../stores/projectStore";

/**
 * Create a mock project store for Storybook
 *
 * @param overrides - Partial store state to override defaults
 */
function createMockProjectStore(overrides: Partial<ProjectStore> = {}) {
  const {
    deleteProject,
    renameProject,
    duplicateProject,
    setProjectArchived,
    ...rest
  } = overrides;
  return create<ProjectStore>(() => ({
    current: null,
    items: [],
    bootstrapStatus: "ready",
    lastError: null,
    clearError: () => {},
    bootstrap: async () => {},
    createAndSetCurrent: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        ok: true,
        data: { projectId: "mock-id", rootPath: "/mock/path" },
      };
    },
    setCurrentProject: async () => {
      return {
        ok: true,
        data: { projectId: "mock-id", rootPath: "/mock/path" },
      };
    },
    ...rest,
    deleteProject:
      deleteProject ??
      (async () => {
        return { ok: true, data: { deleted: true } };
      }),
    renameProject:
      renameProject ??
      (async ({ projectId, name }) => {
        return {
          ok: true,
          data: { projectId, name, updatedAt: Date.now() },
        };
      }),
    duplicateProject:
      duplicateProject ??
      (async ({ projectId }) => {
        return {
          ok: true,
          data: {
            projectId: `${projectId}-copy`,
            rootPath: "/mock/path-copy",
            name: "Mock Copy",
          },
        };
      }),
    setProjectArchived:
      setProjectArchived ??
      (async ({ projectId, archived }) => {
        return {
          ok: true,
          data: {
            projectId,
            archived,
            ...(archived ? { archivedAt: Date.now() } : {}),
          },
        };
      }),
  }));
}

/**
 * Wrapper component that provides mock store
 */
function MockStoreWrapper({
  children,
  storeOverrides,
}: {
  children: React.ReactNode;
  storeOverrides?: Partial<ProjectStore>;
}) {
  const [store] = useState(() => createMockProjectStore(storeOverrides));
  return <ProjectStoreProvider store={store}>{children}</ProjectStoreProvider>;
}

/**
 * WelcomeScreen 组件 Story
 *
 * 功能：
 * - 新用户/无项目时的入口页面
 * - 展示欢迎信息
 * - 提供创建项目入口
 *
 * 状态验收：
 * - 空状态（无项目）
 * - 已有项目状态
 * - 加载状态
 */
const meta: Meta<typeof WelcomeScreen> = {
  title: "Features/WelcomeScreen",
  component: WelcomeScreen,
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "dark",
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div
        className="w-full min-h-[400px] p-8 flex items-center justify-center bg-[var(--color-bg-base)]"
        data-theme="dark"
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof WelcomeScreen>;

/**
 * Story 1: EmptyState（空状态）
 *
 * 用户首次使用或无项目时的默认状态。
 *
 * 验收点：
 * - 显示欢迎标题 "Welcome to CreoNow"
 * - 显示引导文字
 * - "Create project" 按钮可点击
 * - 卡片使用正确的圆角和间距
 */
export const EmptyState: Story = {
  decorators: [
    (Story) => (
      <MockStoreWrapper
        storeOverrides={{
          current: null,
          bootstrapStatus: "ready",
        }}
      >
        <div
          className="w-full min-h-[400px] p-8 flex items-center justify-center bg-[var(--color-bg-base)]"
          data-theme="dark"
        >
          <Story />
        </div>
      </MockStoreWrapper>
    ),
  ],
};

/**
 * Story 2: WithExistingProject（已有项目）
 *
 * 用户已有当前项目时的状态。
 *
 * 验收点：
 * - 显示当前项目 ID
 * - 不显示欢迎卡片
 */
export const WithExistingProject: Story = {
  decorators: [
    (Story) => (
      <MockStoreWrapper
        storeOverrides={{
          current: {
            projectId: "my-novel-project",
            rootPath: "/Users/writer/Documents/MyNovel",
          },
          bootstrapStatus: "ready",
        }}
      >
        <div
          className="w-full min-h-[400px] p-8 flex items-center justify-center bg-[var(--color-bg-base)]"
          data-theme="dark"
        >
          <Story />
        </div>
      </MockStoreWrapper>
    ),
  ],
};

/**
 * Story 3: LoadingState（加载状态）
 *
 * 正在加载项目信息时的状态。
 *
 * 验收点：
 * - bootstrapStatus 为 "loading" 时的行为
 * - 组件应正常渲染（不崩溃）
 */
export const LoadingState: Story = {
  decorators: [
    (Story) => (
      <MockStoreWrapper
        storeOverrides={{
          current: null,
          bootstrapStatus: "loading",
        }}
      >
        <div
          className="w-full min-h-[400px] p-8 flex items-center justify-center bg-[var(--color-bg-base)]"
          data-theme="dark"
        >
          <Story />
        </div>
      </MockStoreWrapper>
    ),
  ],
};

/**
 * Story 4: Interactive（交互演示）
 *
 * 可以交互的完整流程演示。
 *
 * 验收点：
 * - 点击 "Create project" 按钮打开创建对话框
 * - 对话框可以正常关闭
 */
export const Interactive: Story = {
  decorators: [
    (Story) => (
      <MockStoreWrapper
        storeOverrides={{
          current: null,
          bootstrapStatus: "ready",
        }}
      >
        <div
          className="w-full min-h-[400px] p-8 flex items-center justify-center bg-[var(--color-bg-base)]"
          data-theme="dark"
        >
          <Story />
        </div>
      </MockStoreWrapper>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "点击 'Create project' 按钮可打开创建项目对话框，验证交互流程正常工作。",
      },
    },
  },
};
