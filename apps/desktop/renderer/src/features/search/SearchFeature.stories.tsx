import type { Meta, StoryObj } from '@storybook/react';
import { SearchFeature } from './SearchFeature';

const meta = {
  title: 'Features/SearchFeature',
  component: SearchFeature,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="w-[420px] h-[560px] bg-background border border-border rounded-lg overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchFeature>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
