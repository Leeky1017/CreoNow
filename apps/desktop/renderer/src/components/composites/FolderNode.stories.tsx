import type { Meta, StoryObj } from '@storybook/react';
import { FolderNode } from './FolderNode';
import { FileNode } from './FileNode';

const meta = {
  title: 'Composites/FolderNode',
  component: FolderNode,
  tags: ['autodocs'],
  args: {
    name: 'chapters',
  },
} satisfies Meta<typeof FolderNode>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Open: Story = {
  args: {
    defaultOpen: true,
    children: (
      <>
        <FileNode name="chapter-01.md" />
        <FileNode name="chapter-02.md" />
        <FileNode name="chapter-03.md" />
      </>
    ),
  },
};

export const Selected: Story = {
  args: {
    selected: true,
    defaultOpen: true,
    children: <FileNode name="notes.md" />,
  },
};
