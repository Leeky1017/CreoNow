import type { Meta, StoryObj } from "@storybook/react-vite";
import { Shell } from "./shell";

const meta = {
  title: "Features/Shell",
  component: Shell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Shell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="flex items-center justify-center h-full text-[var(--muted-foreground)]">
        Main Content Area
      </div>
    ),
  },
};

export const WithContent: Story = {
  args: {
    children: (
      <div className="p-8">
        <h1 className="text-xl font-semibold text-[var(--foreground)] mb-4">
          Editor Area
        </h1>
        <p className="text-[var(--muted-foreground)]">
          This is where the editor will be rendered.
        </p>
      </div>
    ),
  },
};
