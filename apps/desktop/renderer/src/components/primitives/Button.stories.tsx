import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

/**
 * Button 组件 Story
 *
 * 设计规范 §6.1
 * 支持多种 variant（primary, secondary, ghost, danger）和 size（sm, md, lg）。
 */
const meta = {
  title: "Primitives/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "danger"],
      description: "Visual style variant",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size of the button",
    },
    loading: {
      control: "boolean",
      description: "Show loading spinner and disable interactions",
    },
    fullWidth: {
      control: "boolean",
      description: "Full width button",
    },
    disabled: {
      control: "boolean",
      description: "Disable the button",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 默认状态：secondary variant, md size */
export const Default: Story = {
  args: {
    children: "Button",
    variant: "secondary",
    size: "md",
  },
};

/** Primary variant：主要 CTA 按钮 */
export const Primary: Story = {
  args: {
    children: "Primary Button",
    variant: "primary",
    size: "md",
  },
};

/** Secondary variant：次要操作按钮 */
export const Secondary: Story = {
  args: {
    children: "Secondary Button",
    variant: "secondary",
    size: "md",
  },
};

/** Ghost variant：轻量级操作按钮 */
export const Ghost: Story = {
  args: {
    children: "Ghost Button",
    variant: "ghost",
    size: "md",
  },
};

/** Danger variant：危险/删除操作按钮 */
export const Danger: Story = {
  args: {
    children: "Danger Button",
    variant: "danger",
    size: "md",
  },
};

/** Small size：小尺寸按钮（28px 高） */
export const Small: Story = {
  args: {
    children: "Small Button",
    variant: "secondary",
    size: "sm",
  },
};

/** Medium size：中等尺寸按钮（36px 高） */
export const Medium: Story = {
  args: {
    children: "Medium Button",
    variant: "secondary",
    size: "md",
  },
};

/** Large size：大尺寸按钮（44px 高） */
export const Large: Story = {
  args: {
    children: "Large Button",
    variant: "secondary",
    size: "lg",
  },
};

/** Loading state：加载状态 */
export const Loading: Story = {
  args: {
    children: "Loading...",
    variant: "primary",
    size: "md",
    loading: true,
  },
};

/** Disabled state：禁用状态 */
export const Disabled: Story = {
  args: {
    children: "Disabled Button",
    variant: "secondary",
    size: "md",
    disabled: true,
  },
};

/** Full width：全宽按钮 */
export const FullWidth: Story = {
  args: {
    children: "Full Width Button",
    variant: "primary",
    size: "md",
    fullWidth: true,
  },
  parameters: {
    layout: "padded",
  },
};

/** 所有 Variants 展示 */
export const AllVariants: Story = {
  args: {
    children: "Button",
  },
  render: () => (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};

/** 所有 Sizes 展示 */
export const AllSizes: Story = {
  args: {
    children: "Button",
  },
  render: () => (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
