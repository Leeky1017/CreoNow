import type { Meta, StoryObj } from '@storybook/react';
import { RightPanel } from './RightPanel';

const meta: Meta<typeof RightPanel> = {
  title: 'Shell/RightPanel',
  component: RightPanel,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-[600px] bg-background flex justify-end">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
