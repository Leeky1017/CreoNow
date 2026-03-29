import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router';
import { CharactersPage } from './CharactersPage';

const meta: Meta<typeof CharactersPage> = {
  title: 'Pages/CharactersPage',
  component: CharactersPage,
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
