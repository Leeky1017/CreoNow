import type { Meta, StoryObj } from "@storybook/react";
import { ScrollArea } from "./ScrollArea";

const meta = {
  title: "Primitives/ScrollArea",
  component: ScrollArea,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    style: { height: 200, width: 300 },
    children: (
      <div style={{ padding: "1rem" }}>
        {Array.from({ length: 20 }, (_, i) => (
          <p key={i} style={{ color: "var(--color-fg-default)", margin: "0.5rem 0" }}>
            {`Item ${i + 1} — 滚动区域内容`}
          </p>
        ))}
      </div>
    ),
  },
};

export const Horizontal: Story = {
  args: {
    style: { height: 100, width: 300 },
    children: (
      <div style={{ display: "flex", gap: "1rem", padding: "1rem", width: 800 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: 120,
              height: 60,
              background: "var(--color-bg-raised)",
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-fg-default)",
            }}
          >
            {`Card ${i + 1}`}
          </div>
        ))}
      </div>
    ),
  },
};
