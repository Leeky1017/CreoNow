import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router';
import { ContextPanel } from './ContextPanel';

const meta: Meta<typeof ContextPanel> = {
  title: 'Shell/ContextPanel',
  component: ContextPanel,
  tags: ['autodocs'],
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

export default meta;
type Story = StoryObj<typeof meta>;

export const FilesRoute: Story = {};

export const OtherRoute: Story = {
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
