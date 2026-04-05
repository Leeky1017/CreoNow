import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { SearchBar } from "./SearchBar";

const meta: Meta<typeof SearchBar> = {
  title: "Composites/SearchBar",
  component: SearchBar,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof SearchBar>;

export const Default: Story = {
  render: function Render() {
    const [value, setValue] = useState("");
    return <SearchBar value={value} onChange={setValue} />;
  },
};

export const WithValue: Story = {
  render: function Render() {
    const [value, setValue] = useState("风从北方来");
    return <SearchBar value={value} onChange={setValue} />;
  },
};

export const Placeholder: Story = {
  render: function Render() {
    const [value, setValue] = useState("");
    return <SearchBar value={value} onChange={setValue} placeholder="搜索项目…" />;
  },
};
