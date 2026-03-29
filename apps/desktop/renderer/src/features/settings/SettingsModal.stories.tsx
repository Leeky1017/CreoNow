import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SettingsModal } from './SettingsModal';
import { Button } from '@/components/primitives';

const meta = {
  title: 'Features/SettingsModal',
  component: SettingsModal,
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean', description: 'Whether modal is visible' },
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SettingsModal>;

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
        <Button onClick={() => setOpen(true)}>打开设置</Button>
        <SettingsModal open={open} onClose={() => setOpen(false)} />
      </div>
    );
  },
};
