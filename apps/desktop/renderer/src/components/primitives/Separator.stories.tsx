import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from './Separator';

const meta = {
  title: 'Primitives/Separator',
  component: Separator,
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
  decorators: [
    (Story) => (
      <div className="w-64">
        <p className="text-sm text-foreground">Above</p>
        <Story />
        <p className="text-sm text-foreground">Below</p>
      </div>
    ),
  ],
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  decorators: [
    (Story) => (
      <div className="flex h-8 items-center gap-3">
        <span className="text-sm text-foreground">Left</span>
        <Story />
        <span className="text-sm text-foreground">Right</span>
      </div>
    ),
  ],
};
