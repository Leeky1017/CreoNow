import type { Meta, StoryObj } from '@storybook/react';
import { VersionHistory } from './VersionHistory';

const meta = {
  title: 'Features/VersionHistory',
  component: VersionHistory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="w-[360px] h-[500px] bg-sidebar border border-border rounded-lg overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VersionHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: { versions: [] },
};
