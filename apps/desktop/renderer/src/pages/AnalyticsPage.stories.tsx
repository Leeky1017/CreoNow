import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router';
import { AnalyticsPage } from './AnalyticsPage';

const meta: Meta<typeof AnalyticsPage> = {
  title: 'Pages/AnalyticsPage',
  component: AnalyticsPage,
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
