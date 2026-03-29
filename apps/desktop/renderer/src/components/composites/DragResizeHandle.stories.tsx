import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DragResizeHandle } from './DragResizeHandle';

const meta: Meta<typeof DragResizeHandle> = {
  title: 'Composites/DragResizeHandle',
  component: DragResizeHandle,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

function DragResizeDemo() {
  const [width, setWidth] = useState(260);

  return (
    <div className="flex h-64 bg-background">
      <div className="bg-sidebar border-r border-border" style={{ width }}>
        <div className="p-3 text-sm text-foreground">
          {width}px
        </div>
      </div>
      <DragResizeHandle
        direction="left"
        onResize={(delta) => setWidth((w) => Math.max(160, Math.min(480, w + delta)))}
      />
      <div className="flex-1 bg-background p-3 text-sm text-muted-foreground">
        Main content
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => <DragResizeDemo />,
};
