import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta = {
  title: 'Primitives/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'accent', 'destructive', 'outline'],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Badge' },
};

export const Accent: Story = {
  args: { children: 'New', variant: 'accent' },
};

export const Destructive: Story = {
  args: { children: 'Error', variant: 'destructive' },
};

export const Outline: Story = {
  args: { children: 'v1.0', variant: 'outline' },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Badge>Default</Badge>
      <Badge variant="accent">Accent</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};
