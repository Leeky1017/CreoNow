import type { Meta, StoryObj } from '@storybook/react';
import { Surface } from './Surface';

const meta = {
  title: 'Primitives/Surface',
  component: Surface,
  tags: ['autodocs'],
} satisfies Meta<typeof Surface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Surface variant="default" className="p-4">
        <p className="text-sm text-foreground">Default — bordered surface</p>
      </Surface>
      <Surface variant="elevated" className="p-4">
        <p className="text-sm text-foreground">Elevated — with shadow</p>
      </Surface>
      <Surface variant="inset" className="p-4">
        <p className="text-sm text-foreground">Inset — recessed background</p>
      </Surface>
    </div>
  ),
};
