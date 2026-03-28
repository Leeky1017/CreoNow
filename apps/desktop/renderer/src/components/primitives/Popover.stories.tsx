import type { Meta, StoryObj } from '@storybook/react';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { Button } from './Button';
import { Input } from './Input';

const meta = {
  title: 'Primitives/Popover',
  component: Popover,
  tags: ['autodocs'],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center justify-center p-16">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Open Popover</Button>
        </PopoverTrigger>
        <PopoverContent>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Settings</p>
            <Input placeholder="Width" />
            <Input placeholder="Height" />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  ),
};

export const LeftAligned: Story = {
  render: () => (
    <div className="flex items-center justify-center p-16">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost">Align start</Button>
        </PopoverTrigger>
        <PopoverContent align="start" side="bottom">
          <p className="text-sm text-muted-foreground">
            This popover is left-aligned.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  ),
};
