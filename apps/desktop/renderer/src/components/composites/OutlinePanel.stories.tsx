import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { OutlinePanel, type OutlineItem } from './OutlinePanel';

const MOCK_ITEMS: OutlineItem[] = [
  { id: '1', level: 1, text: '第一章：序幕' },
  { id: '2', level: 2, text: '引子' },
  { id: '3', level: 2, text: '人物出场' },
  { id: '4', level: 3, text: '林夏的回忆' },
  { id: '5', level: 1, text: '第二章：初遇' },
  { id: '6', level: 2, text: '古城到达' },
  { id: '7', level: 2, text: '密室发现' },
  { id: '8', level: 3, text: '青铜器之谜' },
  { id: '9', level: 1, text: '第三章：困境' },
];

const meta = {
  title: 'Composites/OutlinePanel',
  component: OutlinePanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof OutlinePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: MOCK_ITEMS,
    activeId: '3',
  },
  render: (args) => (
    <div className="w-60 h-96 bg-sidebar border border-border rounded-lg overflow-hidden">
      <OutlinePanel {...args} />
    </div>
  ),
};

export const Interactive: Story = {
  args: {
    items: MOCK_ITEMS,
  },
  render: (args) => {
    const [activeId, setActiveId] = useState<string | undefined>('1');
    return (
      <div className="w-60 h-96 bg-sidebar border border-border rounded-lg overflow-hidden">
        <OutlinePanel
          items={args.items}
          activeId={activeId}
          onItemClick={(id) => setActiveId(id)}
        />
      </div>
    );
  },
};

export const Empty: Story = {
  args: {
    items: [],
  },
  render: (args) => (
    <div className="w-60 h-64 bg-sidebar border border-border rounded-lg overflow-hidden">
      <OutlinePanel {...args} />
    </div>
  ),
};
