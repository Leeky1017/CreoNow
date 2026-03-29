import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './Textarea';

const meta = {
  title: 'Primitives/Textarea',
  component: Textarea,
  tags: ['autodocs'],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithPlaceholder: Story = {
  args: { placeholder: 'Type your message here...' },
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Disabled textarea' },
};

export const WithError: Story = {
  args: {
    error: true,
    errorMessage: 'This field is required',
    id: 'textarea-error',
  },
};
