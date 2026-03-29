import type { Meta, StoryObj } from '@storybook/react';
import { FileTree } from './FileTree';

const meta: Meta<typeof FileTree> = {
  title: 'Features/FileTree',
  component: FileTree,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-60 h-96 bg-sidebar">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
