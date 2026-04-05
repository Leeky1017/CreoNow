import type { Meta, StoryObj } from "@storybook/react";

import { BookOpen, MapPin, Type, Users } from "lucide-react";

import { StatPill } from "./StatPill";

const meta: Meta<typeof StatPill> = {
  title: "Composites/StatPill",
  component: StatPill,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof StatPill>;

export const Default: Story = {
  args: {
    icon: <Type size={12} />,
    label: "32,450 字",
  },
};

export const Multiple: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <StatPill icon={<Type size={12} />} label="32,450 字" />
      <StatPill icon={<BookOpen size={12} />} label="8 章" />
      <StatPill icon={<Users size={12} />} label="12 个角色" />
      <StatPill icon={<MapPin size={12} />} label="5 个地点" />
    </div>
  ),
};
