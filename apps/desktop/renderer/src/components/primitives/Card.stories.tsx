import type { Meta, StoryObj } from "@storybook/react";
import type { CardVariant } from "./Card";
import { Card } from "./Card";

/**
 * Card 组件 Story
 *
 * 设计规范 §6.3
 * 容器组件，用于内容分组和视觉分隔。
 *
 * Variant 矩阵：
 * - default: 标准边框（无阴影）
 * - raised: 带阴影的悬浮样式
 * - bordered: 加粗边框
 *
 * 状态矩阵（MUST 全部实现）：
 * - default: 正常样式
 * - hover (hoverable): 边框高亮 + 可选阴影
 */
const meta = {
  title: "Primitives/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "raised", "bordered"],
      description: "Visual style variant",
    },
    hoverable: {
      control: "boolean",
      description: "Enable hover effect (border highlight, optional shadow)",
    },
    noPadding: {
      control: "boolean",
      description: "Remove padding for custom layouts",
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// 基础 Stories
// ============================================================================

/** 默认状态：标准卡片 */
export const Default: Story = {
  args: {
    children: (
      <div>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "16px", fontWeight: 600 }}>
          Card Title
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "var(--color-fg-muted)",
          }}
        >
          This is the card content. Cards are containers for grouping related
          content.
        </p>
      </div>
    ),
  },
};

/** Raised variant：带阴影的悬浮卡片 */
export const Raised: Story = {
  args: {
    variant: "raised",
    children: (
      <div>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "16px", fontWeight: 600 }}>
          Raised Card
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "var(--color-fg-muted)",
          }}
        >
          This card has elevation shadow for floating elements.
        </p>
      </div>
    ),
  },
};

/** Bordered variant：加粗边框卡片 */
export const Bordered: Story = {
  args: {
    variant: "bordered",
    children: (
      <div>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "16px", fontWeight: 600 }}>
          Bordered Card
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "var(--color-fg-muted)",
          }}
        >
          This card has a prominent border.
        </p>
      </div>
    ),
  },
};

// ============================================================================
// Hoverable Stories
// ============================================================================

/** Hoverable：可点击卡片（有 hover 效果） */
export const Hoverable: Story = {
  args: {
    hoverable: true,
    children: (
      <div>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "16px", fontWeight: 600 }}>
          Hoverable Card
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "var(--color-fg-muted)",
          }}
        >
          Hover over this card to see the effect.
        </p>
      </div>
    ),
  },
};

/** Hoverable + Raised：可点击悬浮卡片 */
export const HoverableRaised: Story = {
  args: {
    variant: "raised",
    hoverable: true,
    children: (
      <div>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "16px", fontWeight: 600 }}>
          Hoverable Raised Card
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "var(--color-fg-muted)",
          }}
        >
          Combined raised variant with hover effect.
        </p>
      </div>
    ),
  },
};

// ============================================================================
// Padding Stories
// ============================================================================

/** No Padding：无内边距 */
export const NoPadding: Story = {
  args: {
    noPadding: true,
    children: (
      <div style={{ padding: "1rem", background: "var(--color-bg-muted)" }}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "16px", fontWeight: 600 }}>
          Custom Padding Card
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "var(--color-fg-muted)",
          }}
        >
          This card has no padding - useful for custom layouts.
        </p>
      </div>
    ),
  },
};

// ============================================================================
// 组合展示 Stories
// ============================================================================

/** 所有 Variants 展示 */
export const AllVariants: Story = {
  args: {
    children: "Card",
  },
  render: () => (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      <Card>
        <div style={{ minWidth: "150px" }}>
          <strong>Default</strong>
          <p
            style={{
              margin: "0.5rem 0 0",
              fontSize: "14px",
              color: "var(--color-fg-muted)",
            }}
          >
            Standard card
          </p>
        </div>
      </Card>
      <Card variant="raised">
        <div style={{ minWidth: "150px" }}>
          <strong>Raised</strong>
          <p
            style={{
              margin: "0.5rem 0 0",
              fontSize: "14px",
              color: "var(--color-fg-muted)",
            }}
          >
            Elevated card
          </p>
        </div>
      </Card>
      <Card variant="bordered">
        <div style={{ minWidth: "150px" }}>
          <strong>Bordered</strong>
          <p
            style={{
              margin: "0.5rem 0 0",
              fontSize: "14px",
              color: "var(--color-fg-muted)",
            }}
          >
            Prominent border
          </p>
        </div>
      </Card>
    </div>
  ),
};

/** 所有 Hoverable 状态展示 */
export const AllHoverable: Story = {
  args: {
    children: "Card",
  },
  render: () => (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      <Card hoverable>
        <div style={{ minWidth: "150px" }}>
          <strong>Default Hoverable</strong>
          <p
            style={{
              margin: "0.5rem 0 0",
              fontSize: "14px",
              color: "var(--color-fg-muted)",
            }}
          >
            Hover to see effect
          </p>
        </div>
      </Card>
      <Card variant="raised" hoverable>
        <div style={{ minWidth: "150px" }}>
          <strong>Raised Hoverable</strong>
          <p
            style={{
              margin: "0.5rem 0 0",
              fontSize: "14px",
              color: "var(--color-fg-muted)",
            }}
          >
            Hover to see effect
          </p>
        </div>
      </Card>
      <Card variant="bordered" hoverable>
        <div style={{ minWidth: "150px" }}>
          <strong>Bordered Hoverable</strong>
          <p
            style={{
              margin: "0.5rem 0 0",
              fontSize: "14px",
              color: "var(--color-fg-muted)",
            }}
          >
            Hover to see effect
          </p>
        </div>
      </Card>
    </div>
  ),
};

// ============================================================================
// Slot 模式展示
// ============================================================================

/** Header + Content + Footer Slot 模式 */
export const WithSlots: Story = {
  args: {
    children: "Card",
  },
  render: () => (
    <Card>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid var(--color-border-default)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
          Card Header
        </h3>
        <button
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-fg-muted)",
          }}
        >
          ...
        </button>
      </div>
      {/* Content */}
      <div style={{ marginBottom: "1rem" }}>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "var(--color-fg-muted)",
          }}
        >
          This is the main content area of the card. It can contain any type of
          content including text, images, forms, or other components.
        </p>
      </div>
      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.5rem",
          paddingTop: "0.75rem",
          borderTop: "1px solid var(--color-border-default)",
        }}
      >
        <button
          style={{
            padding: "0.5rem 1rem",
            background: "transparent",
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          style={{
            padding: "0.5rem 1rem",
            background: "var(--color-primary)",
            color: "white",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
          }}
        >
          Save
        </button>
      </div>
    </Card>
  ),
};

// ============================================================================
// 边界情况 Stories
// ============================================================================

/**
 * 空内容
 *
 * 验证空内容时卡片仍保持正常样式
 */
export const EmptyContent: Story = {
  args: {
    children: <div style={{ height: "50px" }} />,
  },
};

/**
 * 超长内容
 *
 * 验证内容溢出时的处理
 */
export const LongContent: Story = {
  args: {
    children: (
      <div>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "16px", fontWeight: 600 }}>
          Card with Long Content
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "var(--color-fg-muted)",
          }}
        >
          This is a very long piece of content that demonstrates how the card
          handles overflow. Lorem ipsum dolor sit amet, consectetur adipiscing
          elit. Sed do eiusmod tempor incididunt ut labore et dolore magna
          aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
          laboris nisi ut aliquip ex ea commodo consequat.
        </p>
      </div>
    ),
  },
};

/**
 * 超长内容（在有限宽度容器中）
 *
 * 验证内容过长时不会撑破布局
 */
export const LongContentConstrained: Story = {
  args: {
    children: "Card",
  },
  parameters: {
    layout: "padded",
  },
  render: () => (
    <div
      style={{
        width: "300px",
        border: "1px dashed var(--color-border-default)",
      }}
    >
      <Card>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "16px", fontWeight: 600 }}>
          Very Long Card Title That Should Handle Overflow
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "var(--color-fg-muted)",
          }}
        >
          This content is constrained within a 300px container.
        </p>
      </Card>
    </div>
  ),
};

/**
 * 嵌套 Card
 *
 * 验证嵌套卡片的样式
 */
export const NestedCards: Story = {
  args: {
    children: "Card",
  },
  render: () => (
    <Card>
      <h3 style={{ margin: "0 0 1rem", fontSize: "16px", fontWeight: 600 }}>
        Parent Card
      </h3>
      <Card variant="bordered">
        <h4 style={{ margin: "0 0 0.5rem", fontSize: "14px", fontWeight: 600 }}>
          Nested Card
        </h4>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color: "var(--color-fg-muted)",
          }}
        >
          Cards can be nested for complex layouts.
        </p>
      </Card>
    </Card>
  ),
};

/**
 * 带 Emoji 的卡片
 *
 * 验证 emoji 正确显示
 */
export const WithEmoji: Story = {
  args: {
    children: (
      <div>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "16px", fontWeight: 600 }}>
          🚀 Launch Card
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "var(--color-fg-muted)",
          }}
        >
          Card with emoji content 🎉
        </p>
      </div>
    ),
  },
};

// ============================================================================
// 完整矩阵展示（用于 AI 自检）
// ============================================================================

const variants: CardVariant[] = ["default", "raised", "bordered"];

/**
 * 完整 Variant 矩阵
 *
 * 展示所有 3 种 variant 的组合
 */
export const VariantMatrix: Story = {
  args: {
    children: "Card",
  },
  parameters: {
    layout: "padded",
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {variants.map((variant) => (
        <div key={variant}>
          <div
            style={{
              marginBottom: "0.5rem",
              fontSize: "12px",
              color: "var(--color-fg-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {variant}
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <Card variant={variant}>
              <div style={{ minWidth: "120px" }}>
                <strong>Normal</strong>
                <p
                  style={{
                    margin: "0.5rem 0 0",
                    fontSize: "12px",
                    color: "var(--color-fg-muted)",
                  }}
                >
                  Default state
                </p>
              </div>
            </Card>
            <Card variant={variant} hoverable>
              <div style={{ minWidth: "120px" }}>
                <strong>Hoverable</strong>
                <p
                  style={{
                    margin: "0.5rem 0 0",
                    fontSize: "12px",
                    color: "var(--color-fg-muted)",
                  }}
                >
                  Hover me
                </p>
              </div>
            </Card>
          </div>
        </div>
      ))}
    </div>
  ),
};

/**
 * 完整状态展示（用于 AI 自检）
 *
 * 包含所有 variant、hoverable 状态的完整矩阵，便于一次性检查
 */
export const FullMatrix: Story = {
  args: {
    children: "Card",
  },
  parameters: {
    layout: "fullscreen",
  },
  render: () => (
    <div
      style={{
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
    >
      {/* Variants */}
      <section>
        <h3
          style={{
            margin: "0 0 1rem",
            fontSize: "14px",
            color: "var(--color-fg-default)",
          }}
        >
          Variants
        </h3>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {variants.map((variant) => (
            <Card key={variant} variant={variant}>
              <div style={{ minWidth: "120px" }}>
                <strong>{variant}</strong>
                <p
                  style={{
                    margin: "0.5rem 0 0",
                    fontSize: "12px",
                    color: "var(--color-fg-muted)",
                  }}
                >
                  Card variant
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Hoverable States */}
      <section>
        <h3
          style={{
            margin: "0 0 1rem",
            fontSize: "14px",
            color: "var(--color-fg-default)",
          }}
        >
          Hoverable States
        </h3>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {variants.map((variant) => (
            <Card key={variant} variant={variant} hoverable>
              <div style={{ minWidth: "120px" }}>
                <strong>{variant} + hoverable</strong>
                <p
                  style={{
                    margin: "0.5rem 0 0",
                    fontSize: "12px",
                    color: "var(--color-fg-muted)",
                  }}
                >
                  Hover to see effect
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Padding Options */}
      <section>
        <h3
          style={{
            margin: "0 0 1rem",
            fontSize: "14px",
            color: "var(--color-fg-default)",
          }}
        >
          Padding Options
        </h3>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Card>
            <div style={{ minWidth: "120px" }}>
              <strong>With Padding</strong>
              <p
                style={{
                  margin: "0.5rem 0 0",
                  fontSize: "12px",
                  color: "var(--color-fg-muted)",
                }}
              >
                Default padding (24px)
              </p>
            </div>
          </Card>
          <Card noPadding>
            <div
              style={{
                padding: "1rem",
                background: "var(--color-bg-muted)",
                minWidth: "120px",
              }}
            >
              <strong>No Padding</strong>
              <p
                style={{
                  margin: "0.5rem 0 0",
                  fontSize: "12px",
                  color: "var(--color-fg-muted)",
                }}
              >
                Custom layout
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Slot Pattern */}
      <section>
        <h3
          style={{
            margin: "0 0 1rem",
            fontSize: "14px",
            color: "var(--color-fg-default)",
          }}
        >
          Slot Pattern (Header + Content + Footer)
        </h3>
        <div style={{ maxWidth: "400px" }}>
          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid var(--color-border-default)",
              }}
            >
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
                Header
              </h4>
              <span style={{ color: "var(--color-fg-muted)" }}>...</span>
            </div>
            <p
              style={{
                margin: "0 0 1rem",
                fontSize: "13px",
                color: "var(--color-fg-muted)",
              }}
            >
              Main content area of the card.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid var(--color-border-default)",
              }}
            >
              <span
                style={{ fontSize: "12px", color: "var(--color-fg-muted)" }}
              >
                Footer
              </span>
            </div>
          </Card>
        </div>
      </section>

      {/* Edge Cases */}
      <section>
        <h3
          style={{
            margin: "0 0 1rem",
            fontSize: "14px",
            color: "var(--color-fg-default)",
          }}
        >
          Edge Cases
        </h3>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <Card>
            <div style={{ minWidth: "100px", height: "30px" }}>
              <strong>Empty</strong>
            </div>
          </Card>
          <Card>
            <Card variant="bordered">
              <strong>Nested</strong>
            </Card>
          </Card>
          <Card>
            <strong>🚀 Emoji</strong>
          </Card>
        </div>
      </section>
    </div>
  ),
};

// ============================================================================
// 实际使用场景
// ============================================================================

/**
 * 项目卡片场景
 *
 * 模拟真实的项目列表卡片
 */
export const ProjectCardScenario: Story = {
  args: {
    children: "Card",
  },
  render: () => (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      <Card hoverable style={{ width: "250px" }}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "16px", fontWeight: 600 }}>
          我的小说项目
        </h3>
        <p
          style={{
            margin: "0 0 1rem",
            fontSize: "13px",
            color: "var(--color-fg-muted)",
          }}
        >
          科幻小说创作，目前第三章进行中...
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "var(--color-fg-muted)",
          }}
        >
          <span>12,345 字</span>
          <span>2 天前</span>
        </div>
      </Card>
      <Card hoverable style={{ width: "250px" }}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "16px", fontWeight: 600 }}>
          商业计划书
        </h3>
        <p
          style={{
            margin: "0 0 1rem",
            fontSize: "13px",
            color: "var(--color-fg-muted)",
          }}
        >
          创业项目商业计划书初稿...
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "var(--color-fg-muted)",
          }}
        >
          <span>5,678 字</span>
          <span>1 周前</span>
        </div>
      </Card>
    </div>
  ),
};

/**
 * 设置面板卡片场景
 *
 * 模拟设置页面中的分组卡片
 */
export const SettingsCardScenario: Story = {
  args: {
    children: "Card",
  },
  parameters: {
    layout: "padded",
  },
  render: () => (
    <div
      style={{
        maxWidth: "500px",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <Card>
        <h3 style={{ margin: "0 0 1rem", fontSize: "16px", fontWeight: 600 }}>
          外观设置
        </h3>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "14px" }}>主题</span>
            <span style={{ fontSize: "14px", color: "var(--color-fg-muted)" }}>
              深色
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "14px" }}>字体大小</span>
            <span style={{ fontSize: "14px", color: "var(--color-fg-muted)" }}>
              中
            </span>
          </div>
        </div>
      </Card>
      <Card>
        <h3 style={{ margin: "0 0 1rem", fontSize: "16px", fontWeight: 600 }}>
          AI 设置
        </h3>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "14px" }}>模型</span>
            <span style={{ fontSize: "14px", color: "var(--color-fg-muted)" }}>
              GPT-4
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "14px" }}>创意度</span>
            <span style={{ fontSize: "14px", color: "var(--color-fg-muted)" }}>
              0.7
            </span>
          </div>
        </div>
      </Card>
    </div>
  ),
};
