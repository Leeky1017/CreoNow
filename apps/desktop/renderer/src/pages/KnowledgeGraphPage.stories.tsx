import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router';
import { KnowledgeGraphPage } from './KnowledgeGraphPage';

const meta: Meta<typeof KnowledgeGraphPage> = {
  title: 'Pages/KnowledgeGraphPage',
  component: KnowledgeGraphPage,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="h-screen bg-background">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
