import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";

const meta = {
  title: "Primitives/Input",
  component: Input,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: "Type something..." },
};

export const Disabled: Story = {
  args: { placeholder: "Disabled", disabled: true },
};

export const WithValue: Story = {
  args: { defaultValue: "Hello CreoNow" },
};

export const Error: Story = {
  args: { placeholder: "Error state", "aria-invalid": "true" },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-3 w-64">
      <Input placeholder="Default" />
      <Input placeholder="Disabled" disabled />
      <Input defaultValue="With value" />
      <Input placeholder="Error" aria-invalid="true" />
    </div>
  ),
};
