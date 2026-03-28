import type { Meta, StoryObj } from '@storybook/react';
import { ScrollArea } from './ScrollArea';

const meta = {
  title: 'Primitives/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['vertical', 'horizontal', 'both'],
    },
  },
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

const items = Array.from({ length: 30 }, (_, i) => `Item ${i + 1}`);

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => (
    <ScrollArea {...args} className="h-48 w-48 rounded-md border border-border p-3">
      {items.map((item) => (
        <div key={item} className="py-1 text-sm text-foreground">
          {item}
        </div>
      ))}
    </ScrollArea>
  ),
};

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
  render: (args) => (
    <ScrollArea {...args} className="w-64 rounded-md border border-border p-3">
      <div className="flex gap-3">
        {items.map((item) => (
          <div
            key={item}
            className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-foreground"
          >
            {item}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};
