import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ExportDialog } from './ExportDialog';
import { Button } from '@/components/primitives';

const meta = {
  title: 'Features/ExportDialog',
  component: ExportDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ExportDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    onClose: () => {},
  },
};

export const Interactive: Story = {
  args: { open: false, onClose: () => {} },
  render: function InteractiveExport() {
    const [open, setOpen] = useState(false);
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Button onClick={() => setOpen(true)}>导出文档</Button>
        <ExportDialog
          open={open}
          onClose={() => setOpen(false)}
          onExport={(fmt) => console.log('Exported:', fmt)}
        />
      </div>
    );
  },
};
