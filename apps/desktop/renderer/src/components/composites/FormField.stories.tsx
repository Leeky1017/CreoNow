import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '@/components/primitives';
import { FormField } from './FormField';

const meta: Meta<typeof FormField> = {
  title: 'Composites/FormField',
  component: FormField,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-[360px] p-4 bg-background">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Default: Story = {
  args: {
    label: 'Font Size',
    description: 'Set the editor font size in pixels.',
    children: <Input type="number" defaultValue={16} />,
  },
};

export const WithError: Story = {
  args: {
    label: 'Font Size',
    error: 'Value must be between 10 and 32.',
    children: <Input type="number" defaultValue={5} error />,
  },
};

export const WithoutDescription: Story = {
  args: {
    label: 'Auto Save',
    children: <div className="h-5 w-9 rounded-full bg-accent" />,
  },
};
