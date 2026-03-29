import type { Meta, StoryObj } from '@storybook/react';
import { KnowledgeGraphFeature } from './KnowledgeGraphFeature';

const meta = {
  title: 'Features/KnowledgeGraphFeature',
  component: KnowledgeGraphFeature,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="h-screen bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KnowledgeGraphFeature>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
