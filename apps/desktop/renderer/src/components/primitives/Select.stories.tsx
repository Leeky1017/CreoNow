import type { Meta, StoryObj } from "@storybook/react";

import { Select } from "./Select";

const meta: Meta<typeof Select> = {
  title: "Primitives/Select",
  component: Select,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select defaultValue="b">
      <option value="a">选项 A</option>
      <option value="b">选项 B</option>
      <option value="c">选项 C</option>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select defaultValue="a" disabled>
      <option value="a">不可选</option>
    </Select>
  ),
};
