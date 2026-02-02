import type { Meta, StoryObj } from "@storybook/react";
import { AiPanel } from "./AiPanel";
import { layoutDecorator } from "../../components/layout/test-utils";

/**
 * AiPanel 组件 Story
 *
 * 重构后的 AI 面板：
 * - Header Tabs（Assistant / Info 切换）
 * - 用户输入（有框）和 AI 回复（无框）
 * - 发送/停止复合按钮
 * - 输入框内嵌工具栏（Mode / Model / Skill）
 * - 代码块带 Copy/Apply 按钮
 */
const meta = {
  title: "Features/AiPanel",
  component: AiPanel,
  decorators: [layoutDecorator],
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AiPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认状态
 *
 * 空闲状态的 AI 面板，展示完整布局
 */
export const Default: Story = {
  render: () => (
    <div style={{ width: "360px", height: "100vh" }}>
      <AiPanel />
    </div>
  ),
};

/**
 * 对话内容（静态展示）
 *
 * 静态 UI 演示，展示用户输入和 AI 回复的样式
 * - 用户输入（有框）
 * - AI 回复（无框，纯文本流）
 * - 代码块带 Copy/Apply 按钮
 *
 * 注意：这是静态展示，不可交互。完整交互请使用 Default story。
 */
export const ConversationStatic: Story = {
  render: () => <ConversationDemo />,
};

/**
 * Demo component that shows a full conversation flow
 */
function ConversationDemo(): JSX.Element {
  const userRequest = "请帮我优化这段文字，让它更加生动有趣";
  const aiResponse = `好的，我来帮你润色这段文字。

首先，我们可以把开头改得更吸引人：

原文："今天天气很好"
改为："阳光洒落在窗台上，预示着这将是美好的一天"

这样的改动让文字更具画面感，读者能够感受到场景。`;

  return (
    <div
      style={{ width: "400px", height: "100vh" }}
      className="bg-[var(--color-bg-surface)]"
    >
      <section className="flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center h-8 px-2 border-b border-[var(--color-separator)] shrink-0">
          <div className="flex items-center gap-3 h-full">
            <button className="h-full text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-default)] border-b border-[var(--color-accent)]">
              Assistant
            </button>
            <button className="h-full text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] border-b border-transparent">
              Info
            </button>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              className="w-5 h-5 flex items-center justify-center text-[var(--color-fg-muted)]"
              title="History"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>
            <button
              className="w-5 h-5 flex items-center justify-center text-[var(--color-fg-muted)]"
              title="New Chat"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* User Request - boxed */}
          <div className="w-full p-3 border border-[var(--color-border-default)] rounded-[var(--radius-md)] bg-[var(--color-bg-base)]">
            <div className="text-[13px] text-[var(--color-fg-default)]">
              {userRequest}
            </div>
          </div>

          {/* AI Response - no box */}
          <div className="w-full text-[13px] leading-relaxed text-[var(--color-fg-default)] whitespace-pre-wrap">
            {aiResponse}
          </div>

          {/* Code Block Demo */}
          <div className="my-3 border border-[var(--color-border-default)] rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-base)]">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-bg-raised)] border-b border-[var(--color-border-default)]">
              <span className="text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wide">
                typescript
              </span>
              <div className="flex items-center gap-1">
                <button className="px-2 py-0.5 text-[11px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-hover)] rounded">
                  Copy
                </button>
                <button className="px-2 py-0.5 text-[11px] text-[var(--color-fg-accent)] hover:bg-[var(--color-bg-hover)] rounded">
                  Apply
                </button>
              </div>
            </div>
            <pre className="m-0 p-3 overflow-x-auto text-[12px] leading-[1.6] text-[var(--color-fg-default)] font-mono">
              <code>{`function polishText(text: string): string {
  return text
    .replace(/很好/g, '精彩绝伦')
    .replace(/今天/g, '此刻');
}`}</code>
            </pre>
          </div>
        </div>

        {/* Input Area */}
        <div className="shrink-0 p-3 border-t border-[var(--color-separator)]">
          <div className="border border-[var(--color-border-default)] rounded-[var(--radius-md)] bg-[var(--color-bg-base)]">
            <textarea
              placeholder="Ask the AI to help with your writing..."
              className="w-full min-h-[60px] max-h-[160px] p-3 bg-transparent border-none resize-none text-[13px] text-[var(--color-fg-default)] placeholder:text-[var(--color-fg-placeholder)] focus:outline-none"
            />
            <div className="flex items-center justify-between px-2 pb-2">
              <div className="flex items-center gap-1.5">
                <button className="px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-hover)] rounded">
                  Ask ▼
                </button>
                <button className="px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-hover)] rounded">
                  GPT-5.2 ▼
                </button>
                <button className="px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-hover)] rounded">
                  Skill ▼
                </button>
              </div>
              <button className="w-7 h-7 rounded flex items-center justify-center text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-hover)]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * 流式输出状态（静态展示）
 *
 * 静态 UI 演示，展示 AI 正在生成回复时的状态（带光标动画）
 *
 * 注意：这是静态展示，不可交互。完整交互请使用 Default story。
 */
export const StreamingStatic: Story = {
  render: () => <StreamingDemo />,
};

/**
 * Demo component showing streaming state
 */
function StreamingDemo(): JSX.Element {
  return (
    <div
      style={{ width: "360px", height: "100vh" }}
      className="bg-[var(--color-bg-surface)]"
    >
      <section className="flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center h-8 px-2 border-b border-[var(--color-separator)] shrink-0">
          <div className="flex items-center gap-3 h-full">
            <button className="h-full text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-default)] border-b border-[var(--color-accent)]">
              Assistant
            </button>
            <button className="h-full text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] border-b border-transparent">
              Info
            </button>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              className="w-5 h-5 flex items-center justify-center text-[var(--color-fg-muted)]"
              title="History"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>
            <button
              className="w-5 h-5 flex items-center justify-center text-[var(--color-fg-muted)]"
              title="New Chat"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* User Request */}
          <div className="w-full p-3 border border-[var(--color-border-default)] rounded-[var(--radius-md)] bg-[var(--color-bg-base)]">
            <div className="text-[13px] text-[var(--color-fg-default)]">
              请帮我优化这段文字
            </div>
          </div>

          {/* Streaming indicator */}
          <div className="flex items-center gap-2 text-[12px] text-[var(--color-fg-muted)]">
            <div className="w-3 h-3 border-2 border-[var(--color-fg-muted)] border-t-transparent rounded-full animate-spin" />
            <span>Generating...</span>
          </div>

          {/* AI Response with cursor */}
          <div className="w-full text-[13px] leading-relaxed text-[var(--color-fg-default)]">
            让我来帮你优化这段文字。首先我们需要分析原文的结构和语气
            <span className="inline-block w-[6px] h-[14px] bg-[var(--color-fg-default)] ml-0.5 align-text-bottom animate-pulse" />
          </div>
        </div>

        {/* Input Area */}
        <div className="shrink-0 p-3 border-t border-[var(--color-separator)]">
          <div className="border border-[var(--color-border-default)] rounded-[var(--radius-md)] bg-[var(--color-bg-base)]">
            <textarea
              placeholder="Ask the AI..."
              className="w-full min-h-[60px] p-3 bg-transparent border-none resize-none text-[13px] focus:outline-none"
              disabled
            />
            <div className="flex items-center justify-between px-2 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 text-[11px] text-[var(--color-fg-muted)]">
                  Ask
                </span>
                <span className="px-1.5 py-0.5 text-[11px] text-[var(--color-fg-muted)]">
                  GPT-5.2
                </span>
                <span className="px-1.5 py-0.5 text-[11px] text-[var(--color-fg-muted)]">
                  SKILL
                </span>
              </div>
              {/* Stop button */}
              <button className="w-7 h-7 rounded flex items-center justify-center text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]">
                <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center">
                  <div className="w-2 h-2 bg-current rounded-[1px]" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * 窄宽度
 *
 * 最小宽度下的布局（280px）
 */
export const NarrowWidth: Story = {
  render: () => (
    <div style={{ width: "280px", height: "100vh" }}>
      <AiPanel />
    </div>
  ),
};

/**
 * 宽布局
 *
 * 较宽面板下的布局（480px）
 */
export const WideWidth: Story = {
  render: () => (
    <div style={{ width: "480px", height: "100vh" }}>
      <AiPanel />
    </div>
  ),
};

/**
 * 中等高度
 *
 * 限制高度场景（600px）
 */
export const MediumHeight: Story = {
  render: () => (
    <div style={{ width: "360px", height: "600px" }}>
      <AiPanel />
    </div>
  ),
};

/**
 * 历史记录下拉（静态展示）
 *
 * 静态 UI 演示，展示历史记录下拉菜单的样式
 *
 * 注意：这是静态展示，不可交互。完整交互请使用 Default story。
 */
export const HistoryDropdownStatic: Story = {
  render: () => <HistoryDropdownDemo />,
};

/**
 * Demo component showing the history dropdown
 */
function HistoryDropdownDemo(): JSX.Element {
  return (
    <div
      style={{ width: "400px", height: "100vh" }}
      className="bg-[var(--color-bg-surface)]"
    >
      <section className="flex flex-col h-full">
        {/* Header with dropdown open */}
        <header className="flex items-center h-8 px-2 border-b border-[var(--color-separator)] shrink-0 relative">
          <div className="flex items-center gap-3 h-full">
            <button className="h-full text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-default)] border-b border-[var(--color-accent)]">
              Assistant
            </button>
            <button className="h-full text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] border-b border-transparent">
              Info
            </button>
          </div>
          <div className="ml-auto flex items-center gap-1 relative">
            <button
              className="w-5 h-5 flex items-center justify-center text-[var(--color-fg-default)] bg-[var(--color-bg-selected)] rounded"
              title="History"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>
            <button
              className="w-5 h-5 flex items-center justify-center text-[var(--color-fg-muted)]"
              title="New Chat"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {/* History Dropdown (static demo) */}
            <div className="absolute top-full right-0 mt-1 w-64 bg-[var(--color-bg-raised)] border border-[var(--color-border-default)] rounded-lg shadow-xl overflow-hidden z-50">
              {/* Search */}
              <div className="px-3 py-2 border-b border-[var(--color-border-default)]">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full bg-transparent border-none text-[12px] text-[var(--color-fg-default)] placeholder:text-[var(--color-fg-muted)] focus:outline-none"
                />
              </div>

              {/* Today */}
              <div className="px-3 py-1.5 bg-[var(--color-bg-surface)]">
                <span className="text-[10px] text-[var(--color-fg-muted)] uppercase tracking-wide">
                  Today
                </span>
              </div>
              <button className="w-full px-3 py-1.5 text-left hover:bg-[var(--color-bg-hover)] flex items-center group">
                <span className="text-[12px] text-[var(--color-fg-default)] truncate flex-1 min-w-0">
                  Storybook errors investigation
                </span>
                <span className="text-[10px] text-[var(--color-fg-muted)] shrink-0 group-hover:hidden ml-auto">
                  1m
                </span>
                <div className="hidden group-hover:flex items-center gap-0.5 ml-auto">
                  <span
                    className="w-4 h-4 flex items-center justify-center text-[var(--color-fg-muted)]"
                    title="Rename"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </span>
                  <span
                    className="w-4 h-4 flex items-center justify-center text-[var(--color-fg-muted)]"
                    title="Delete"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </span>
                </div>
              </button>
              <button className="w-full px-3 py-1.5 text-left hover:bg-[var(--color-bg-hover)] flex items-center">
                <span className="text-[12px] text-[var(--color-fg-default)] truncate flex-1 min-w-0">
                  RAG与关键字检索对比
                </span>
                <span className="text-[10px] text-[var(--color-fg-muted)] shrink-0 ml-auto">
                  1h
                </span>
              </button>
              <button className="w-full px-3 py-1.5 text-left hover:bg-[var(--color-bg-hover)] flex items-center">
                <span className="text-[12px] text-[var(--color-fg-default)] truncate flex-1 min-w-0">
                  Phase 4 任务代码错误
                </span>
                <span className="text-[10px] text-[var(--color-fg-muted)] shrink-0 ml-auto">
                  3h
                </span>
              </button>

              {/* Yesterday */}
              <div className="px-3 py-1.5 bg-[var(--color-bg-surface)]">
                <span className="text-[10px] text-[var(--color-fg-muted)] uppercase tracking-wide">
                  Yesterday
                </span>
              </div>
              <button className="w-full px-3 py-1.5 text-left hover:bg-[var(--color-bg-hover)] flex items-center">
                <span className="text-[12px] text-[var(--color-fg-default)] truncate flex-1 min-w-0">
                  P2 UI 组件开发与交付
                </span>
                <span className="text-[10px] text-[var(--color-fg-muted)] shrink-0 ml-auto">
                  1d
                </span>
              </button>
              <button className="w-full px-3 py-1.5 text-left hover:bg-[var(--color-bg-hover)] flex items-center">
                <span className="text-[12px] text-[var(--color-fg-default)] truncate flex-1 min-w-0">
                  P2 组件 Story 和测试
                </span>
                <span className="text-[10px] text-[var(--color-fg-muted)] shrink-0 ml-auto">
                  2d
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Content (empty state) */}
        <div className="flex-1 flex items-center justify-center text-center p-4">
          <span className="text-[13px] text-[var(--color-fg-muted)]">
            Ask the AI to help with your writing
          </span>
        </div>

        {/* Input Area */}
        <div className="shrink-0 p-3 border-t border-[var(--color-separator)]">
          <div className="border border-[var(--color-border-default)] rounded-[var(--radius-md)] bg-[var(--color-bg-base)]">
            <textarea
              placeholder="Ask the AI to help with your writing..."
              className="w-full min-h-[60px] p-3 bg-transparent border-none resize-none text-[13px] focus:outline-none"
            />
            <div className="flex items-center justify-between px-2 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 text-[11px] text-[var(--color-fg-muted)]">
                  Ask
                </span>
                <span className="px-1.5 py-0.5 text-[11px] text-[var(--color-fg-muted)]">
                  GPT-5.2
                </span>
                <span className="px-1.5 py-0.5 text-[11px] text-[var(--color-fg-muted)]">
                  SKILL
                </span>
              </div>
              <button className="w-7 h-7 rounded flex items-center justify-center text-[var(--color-fg-muted)]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
