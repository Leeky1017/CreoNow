import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip, TooltipProvider } from './Tooltip';
import { Button } from './Button';

const meta: Meta<typeof Tooltip> = {
  title: 'Primitives/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center justify-center p-16">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
  argTypes: {
    side: {
      control: 'select',
      options: ['top', 'right', 'bottom', 'left'],
    },
  },
} as const;

export default meta;
type Story = StoryObj<typeof meta>;

export const Top: Story = {
  args: {
    content: 'Tooltip on top',
    side: 'top',
    children: <Button variant="outline">Hover me</Button>,
  },
};

export const Right: Story = {
  args: {
    content: 'Tooltip on right',
    side: 'right',
    children: <Button variant="outline">Hover me</Button>,
  },
};

export const Bottom: Story = {
  args: {
    content: 'Tooltip on bottom',
    side: 'bottom',
    children: <Button variant="outline">Hover me</Button>,
  },
};

export const Left: Story = {
  args: {
    content: 'Tooltip on left',
    side: 'left',
    children: <Button variant="outline">Hover me</Button>,
  },
};
