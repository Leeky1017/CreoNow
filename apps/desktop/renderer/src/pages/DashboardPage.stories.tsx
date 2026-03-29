import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router';
import { DashboardPage } from './DashboardPage';

const meta: Meta<typeof DashboardPage> = {
  title: 'Pages/DashboardPage',
  component: DashboardPage,
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
