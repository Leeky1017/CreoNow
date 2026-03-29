import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { LayoutShell } from './LayoutShell';
import { DashboardPage } from '@/pages/DashboardPage';

const meta: Meta<typeof LayoutShell> = {
  title: 'Shell/LayoutShell',
  component: LayoutShell,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <div className="h-screen bg-background">
          <Routes>
            <Route path="/" element={<Story />}>
              <Route path="app/dashboard" element={<DashboardPage />} />
            </Route>
          </Routes>
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
