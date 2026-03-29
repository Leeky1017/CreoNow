import type { Meta, StoryObj } from '@storybook/react';
import { StatsFeature } from './StatsFeature';

const meta = {
  title: 'Features/StatsFeature',
  component: StatsFeature,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="h-screen bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StatsFeature>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
