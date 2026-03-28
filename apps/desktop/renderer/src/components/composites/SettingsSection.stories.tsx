import type { Meta, StoryObj } from '@storybook/react';
import { SettingsSection } from './SettingsSection';

const meta: Meta<typeof SettingsSection> = {
  title: 'Composites/SettingsSection',
  component: SettingsSection,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-[480px] p-4 bg-background">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SettingsSection>;

export const Default: Story = {
  args: {
    title: 'Appearance',
    description: 'Customize how CreoNow looks on your device.',
    children: (
      <div className="space-y-2">
        <div className="h-9 rounded-md bg-muted" />
        <div className="h-9 rounded-md bg-muted" />
      </div>
    ),
  },
};

export const WithoutDescription: Story = {
  args: {
    title: 'Editor',
    children: (
      <div className="space-y-2">
        <div className="h-9 rounded-md bg-muted" />
      </div>
    ),
  },
};
