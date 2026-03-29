import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SearchPanel } from './SearchPanel';
import { Button } from '@/components/primitives';

const meta = {
  title: 'Composites/SearchPanel',
  component: SearchPanel,
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean' },
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SearchPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    onClose: () => {},
  },
};

export const Interactive: Story = {
  args: {
    open: false,
    onClose: () => {},
  },
  render: (args) => {
    const [open, setOpen] = useState(args.open);
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Button onClick={() => setOpen(true)}>⌘K 搜索</Button>
        <SearchPanel open={open} onClose={() => setOpen(false)} />
      </div>
    );
  },
};
