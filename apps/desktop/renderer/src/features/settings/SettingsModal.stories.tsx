import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router';
import { TooltipProvider } from '@/components/primitives';
import { SettingsModal } from './SettingsModal';

const meta: Meta<typeof SettingsModal> = {
  title: 'Features/SettingsModal',
  component: SettingsModal,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/settings']}>
        <TooltipProvider>
          <div className="h-screen w-screen bg-background">
            <Story />
          </div>
        </TooltipProvider>
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SettingsModal>;

export const Default: Story = {};
