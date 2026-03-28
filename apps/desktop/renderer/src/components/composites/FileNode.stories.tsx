import type { Meta, StoryObj } from '@storybook/react';
import { FileNode } from './FileNode';

const meta = {
  title: 'Composites/FileNode',
  component: FileNode,
  tags: ['autodocs'],
  args: {
    name: 'chapter-01.md',
  },
} satisfies Meta<typeof FileNode>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    selected: true,
  },
};

export const LongName: Story = {
  args: {
    name: 'a-very-long-file-name-that-should-be-truncated-when-it-overflows.md',
  },
};
