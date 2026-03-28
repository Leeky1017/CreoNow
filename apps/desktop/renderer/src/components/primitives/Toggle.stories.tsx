import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Toggle } from './Toggle';

const meta = {
  title: 'Primitives/Toggle',
  component: Toggle,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline'],
    },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [pressed, setPressed] = useState(false);
    return (
      <Toggle {...args} pressed={pressed} onPressedChange={setPressed}>
        Bold
      </Toggle>
    );
  },
};

export const Outline: Story = {
  render: () => {
    const [pressed, setPressed] = useState(false);
    return (
      <Toggle variant="outline" pressed={pressed} onPressedChange={setPressed}>
        Italic
      </Toggle>
    );
  },
};

export const Pressed: Story = {
  args: { defaultPressed: true, children: 'Active' },
};

export const Disabled: Story = {
  args: { disabled: true, children: 'Disabled' },
};
