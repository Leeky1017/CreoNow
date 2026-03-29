import type { Meta, StoryObj } from '@storybook/react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from './Select';

const meta = {
  title: 'Primitives/Select',
  component: Select,
  tags: ['autodocs'],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LanguageSelector: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Languages</SelectLabel>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="zh">中文</SelectItem>
          <SelectItem value="ja">日本語</SelectItem>
          <SelectItem value="ko">한국어</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};
