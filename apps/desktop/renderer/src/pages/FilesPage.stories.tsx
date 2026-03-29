import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router';
import { FilesPage } from './FilesPage';

const meta: Meta<typeof FilesPage> = {
  title: 'Pages/FilesPage',
  component: FilesPage,
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

export const FullView: Story = {
  name: 'Full File Tree',
};
