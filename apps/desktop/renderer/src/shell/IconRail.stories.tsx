import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router';
import { IconRail } from './IconRail';

const meta: Meta<typeof IconRail> = {
  title: 'Shell/IconRail',
  component: IconRail,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <div className="h-screen bg-background flex">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FilesActive: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/app/files']}>
        <div className="h-screen bg-background flex">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};
