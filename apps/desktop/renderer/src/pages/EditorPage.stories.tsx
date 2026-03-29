import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router';
import { EditorPage } from './EditorPage';

const meta: Meta<typeof EditorPage> = {
  title: 'Pages/EditorPage',
  component: EditorPage,
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
