import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from './Slider';

const meta = {
  title: 'Primitives/Slider',
  component: Slider,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState([50]);
    return (
      <div className="w-64">
        <Slider {...args} value={value} onValueChange={setValue} max={100} step={1} />
        <p className="mt-2 text-xs text-muted-foreground">Value: {value[0]}</p>
      </div>
    );
  },
};

export const Range: Story = {
  render: () => {
    const [value, setValue] = useState([25, 75]);
    return (
      <div className="w-64">
        <Slider value={value} onValueChange={setValue} max={100} step={1} />
        <p className="mt-2 text-xs text-muted-foreground">
          Range: {value[0]} – {value[1]}
        </p>
      </div>
    );
  },
};

export const Disabled: Story = {
  args: { defaultValue: [40], max: 100, disabled: true },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};
