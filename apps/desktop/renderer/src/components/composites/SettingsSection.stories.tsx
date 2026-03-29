import type { Meta, StoryObj } from '@storybook/react';
import { SettingsSection } from './SettingsSection';

const meta = {
  title: 'Composites/SettingsSection',
  component: SettingsSection,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text', description: 'Section title' },
    description: { control: 'text', description: 'Optional description' },
  },
  args: {
    title: '外观',
    description: '自定义应用外观',
  },
} satisfies Meta<typeof SettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="flex flex-col gap-3">
        <div className="h-9 bg-muted rounded-md" />
        <div className="h-9 bg-muted rounded-md" />
      </div>
    ),
  },
};

export const WithoutDescription: Story = {
  args: {
    description: undefined,
    children: (
      <div className="h-9 bg-muted rounded-md" />
    ),
  },
};
