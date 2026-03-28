import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta = {
  title: 'Primitives/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: 'Enter text…' },
};

export const Filled: Story = {
  args: { defaultValue: 'Hello world' },
};

export const Disabled: Story = {
  args: { placeholder: 'Disabled', disabled: true },
};

export const Error: Story = {
  args: {
    id: 'email',
    defaultValue: 'invalid@',
    error: true,
    errorMessage: 'Please enter a valid email address',
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex w-64 flex-col gap-4">
      <Input placeholder="Default" />
      <Input defaultValue="Filled value" />
      <Input placeholder="Disabled" disabled />
      <Input
        id="err"
        defaultValue="bad value"
        error
        errorMessage="This field is invalid"
      />
    </div>
  ),
};
