import type { Meta, StoryObj } from "@storybook/react";
import type { TextSize, TextColor } from "./Text";
import { Text } from "./Text";

/**
 * Text 组件 Story
 *
 * 设计规范 §4.2 Typography
 * 文本组件，提供统一的排版样式。
 *
 * Size 变体：
 * - body: 13px, 400, 1.5 (默认)
 * - bodyLarge: 16px, 400, 1.8
 * - small: 12px, 400, 1.4
 * - tiny: 11px, 400, 1.2
 * - label: 10px, 500, 1.2, uppercase
 * - code: 13px, mono, 400, 1.5
 *
 * Color 变体：
 * - default, muted, subtle, placeholder
 * - error, success, warning, info
 */
const meta = {
  title: "Primitives/Text",
  component: Text,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["body", "bodyLarge", "small", "tiny", "label", "code"],
      description: "Typography size variant",
    },
    color: {
      control: "select",
      options: [
        "default",
        "muted",
        "subtle",
        "placeholder",
        "error",
        "success",
        "warning",
        "info",
      ],
      description: "Text color",
    },
    weight: {
      control: "select",
      options: ["normal", "medium", "semibold", "bold"],
      description: "Font weight override",
    },
    as: {
      control: "select",
      options: ["span", "p", "div", "label"],
      description: "Render as different element",
    },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// 基础 Stories
// ============================================================================

/**
 * 默认 Text (body)
 */
export const Default: Story = {
  args: {
    children: "This is default body text.",
  },
};

/**
 * Body 变体
 */
export const Body: Story = {
  args: {
    size: "body",
    children: "Body text at 13px with normal weight.",
  },
};

/**
 * Body Large 变体
 */
export const BodyLarge: Story = {
  args: {
    size: "bodyLarge",
    children: "Body large text at 16px for editor content.",
  },
};

/**
 * Small 变体
 */
export const Small: Story = {
  args: {
    size: "small",
    children: "Small text at 12px for secondary information.",
  },
};

/**
 * Tiny 变体
 */
export const Tiny: Story = {
  args: {
    size: "tiny",
    children: "Tiny text at 11px for timestamps and metadata.",
  },
};

/**
 * Label 变体
 */
export const Label: Story = {
  args: {
    size: "label",
    children: "Section Label",
  },
};

/**
 * Code 变体
 */
export const Code: Story = {
  args: {
    size: "code",
    children: 'console.log("Hello, World!");',
  },
};

// ============================================================================
// Size 矩阵
// ============================================================================

const sizes: TextSize[] = [
  "body",
  "bodyLarge",
  "small",
  "tiny",
  "label",
  "code",
];

/**
 * 所有 Size 变体
 */
export const AllSizes: Story = {
  args: {
    children: "Text",
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {sizes.map((size) => (
        <div
          key={size}
          style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}
        >
          <span
            style={{
              width: "80px",
              fontSize: "12px",
              color: "var(--color-fg-muted)",
            }}
          >
            {size}
          </span>
          <Text size={size}>
            {size === "code"
              ? 'const example = "code";'
              : size === "label"
                ? "LABEL TEXT"
                : "The quick brown fox jumps over the lazy dog."}
          </Text>
        </div>
      ))}
    </div>
  ),
};

// ============================================================================
// Color 变体
// ============================================================================

const colors: TextColor[] = [
  "default",
  "muted",
  "subtle",
  "placeholder",
  "error",
  "success",
  "warning",
  "info",
];

/**
 * 所有 Color 变体
 */
export const AllColors: Story = {
  args: {
    children: "Text",
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {colors.map((color) => (
        <div
          key={color}
          style={{ display: "flex", alignItems: "center", gap: "1rem" }}
        >
          <span
            style={{
              width: "80px",
              fontSize: "12px",
              color: "var(--color-fg-muted)",
            }}
          >
            {color}
          </span>
          <Text color={color}>This is {color} colored text.</Text>
        </div>
      ))}
    </div>
  ),
};

// ============================================================================
// Weight 变体
// ============================================================================

/**
 * 所有 Weight 变体
 */
export const AllWeights: Story = {
  args: {
    children: "Text",
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Text weight="normal">Normal weight (400)</Text>
      <Text weight="medium">Medium weight (500)</Text>
      <Text weight="semibold">Semibold weight (600)</Text>
      <Text weight="bold">Bold weight (700)</Text>
    </div>
  ),
};

// ============================================================================
// 元素变体
// ============================================================================

/**
 * 不同元素渲染
 */
export const AsElements: Story = {
  args: {
    children: "Text",
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <Text as="span">Rendered as span (default)</Text>
      <Text as="p">Rendered as paragraph</Text>
      <Text as="div">Rendered as div</Text>
      <Text as="label">Rendered as label</Text>
    </div>
  ),
};

// ============================================================================
// 实际使用场景
// ============================================================================

/**
 * 段落文本
 */
export const Paragraph: Story = {
  args: {
    as: "p",
    size: "body",
    children:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "400px" }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * 辅助文本
 */
export const HelperText: Story = {
  args: {
    size: "small",
    color: "muted",
    children: "This is helper text that provides additional context.",
  },
};

/**
 * 错误消息
 */
export const ErrorMessage: Story = {
  args: {
    size: "small",
    color: "error",
    children: "This field is required.",
  },
};

/**
 * 成功消息
 */
export const SuccessMessage: Story = {
  args: {
    size: "small",
    color: "success",
    children: "Changes saved successfully.",
  },
};

/**
 * 时间戳
 */
export const Timestamp: Story = {
  args: {
    size: "tiny",
    color: "subtle",
    children: "2 hours ago",
  },
};

/**
 * 代码片段
 */
export const CodeSnippet: Story = {
  args: {
    size: "code",
    children: "npm install @creonow/core",
  },
  decorators: [
    (Story) => (
      <div
        style={{
          padding: "0.5rem 1rem",
          background: "var(--color-bg-surface)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <Story />
      </div>
    ),
  ],
};

// ============================================================================
// 边界情况
// ============================================================================

/**
 * 长文本
 */
export const LongText: Story = {
  args: {
    children:
      "This is an extremely long text that might wrap to multiple lines depending on the container width. It should handle wrapping gracefully without breaking the layout or causing any visual issues.",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "300px" }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * 带换行的文本
 */
export const WithLineBreaks: Story = {
  args: {
    as: "p",
    children: "Line 1\nLine 2\nLine 3",
  },
  decorators: [
    (Story) => (
      <div style={{ whiteSpace: "pre-line" }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * 空文本
 */
export const Empty: Story = {
  args: {
    children: "",
  },
};

// ============================================================================
// 完整展示
// ============================================================================

/**
 * 完整功能展示（用于 AI 自检）
 */
export const FullMatrix: Story = {
  args: {
    children: "Text",
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
      {/* Sizes */}
      <section>
        <Text
          size="label"
          color="muted"
          as="div"
          style={{ marginBottom: "0.5rem" }}
        >
          SIZE VARIANTS
        </Text>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {sizes.map((size) => (
            <div
              key={size}
              style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}
            >
              <Text size="tiny" color="muted" style={{ width: "80px" }}>
                {size}
              </Text>
              <Text size={size}>
                {size === "code"
                  ? "const x = 1;"
                  : size === "label"
                    ? "LABEL"
                    : "Sample text"}
              </Text>
            </div>
          ))}
        </div>
      </section>

      {/* Colors */}
      <section>
        <Text
          size="label"
          color="muted"
          as="div"
          style={{ marginBottom: "0.5rem" }}
        >
          COLOR VARIANTS
        </Text>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
        >
          {colors.map((color) => (
            <Text key={color} color={color}>
              {color}: Sample text
            </Text>
          ))}
        </div>
      </section>

      {/* Weights */}
      <section>
        <Text
          size="label"
          color="muted"
          as="div"
          style={{ marginBottom: "0.5rem" }}
        >
          WEIGHT VARIANTS
        </Text>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
        >
          <Text weight="normal">Normal (400)</Text>
          <Text weight="medium">Medium (500)</Text>
          <Text weight="semibold">Semibold (600)</Text>
          <Text weight="bold">Bold (700)</Text>
        </div>
      </section>

      {/* Combined */}
      <section>
        <Text
          size="label"
          color="muted"
          as="div"
          style={{ marginBottom: "0.5rem" }}
        >
          COMBINED USAGE
        </Text>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <Text size="bodyLarge" weight="semibold">
            Article Title
          </Text>
          <Text size="body" color="muted">
            By Author Name
          </Text>
          <Text size="body" as="p">
            This is the article body text that contains the main content.
          </Text>
          <Text size="small" color="subtle">
            Last updated 2 hours ago
          </Text>
        </div>
      </section>
    </div>
  ),
};
