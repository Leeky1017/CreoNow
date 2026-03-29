import type { Meta, StoryObj } from '@storybook/react';
import { MemoryPanel } from './MemoryPanel';

const meta = {
  title: 'Features/MemoryPanel',
  component: MemoryPanel,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="w-[360px] h-[500px] bg-sidebar border border-border rounded-lg overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MemoryPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: { memories: [] },
};
