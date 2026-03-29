import type { Meta, StoryObj } from '@storybook/react';
import { CommandPalette } from './CommandPalette';

const meta: Meta<typeof CommandPalette> = {
  title: 'Features/CommandPalette',
  component: CommandPalette,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    open: true,
    onClose: () => {},
    onExecute: (id) => console.log('Execute:', id),
  },
};

export const Closed: Story = {
  args: {
    open: false,
    onClose: () => {},
  },
};
