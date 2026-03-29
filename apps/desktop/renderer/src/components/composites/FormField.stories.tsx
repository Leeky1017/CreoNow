import type { Meta, StoryObj } from '@storybook/react';
import { FormField } from './FormField';
import { Switch } from '@/components/primitives';

const meta = {
  title: 'Composites/FormField',
  component: FormField,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text', description: 'Field label' },
    description: { control: 'text', description: 'Optional description text' },
    htmlFor: { control: 'text', description: 'For attribute linking to input' },
  },
  args: {
    label: '自动保存',
    description: '在编辑器失去焦点时自动保存',
  },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSwitch: Story = {
  args: {
    children: <Switch />,
  },
};

export const WithoutDescription: Story = {
  args: {
    description: undefined,
    children: <Switch />,
  },
};
