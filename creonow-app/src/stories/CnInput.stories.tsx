import type { Meta, StoryObj } from '@storybook/react'
import { CnInput } from '@/components/ui/cn-input'

const meta = {
  title: 'UI/CnInput',
  component: CnInput,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md'],
    },
    error: { control: 'boolean' },
    errorMessage: { control: 'text' },
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
    label: { control: 'text' },
  },
  args: {
    placeholder: 'Enter text...',
    size: 'md',
    error: false,
    disabled: false,
  },
} satisfies Meta<typeof CnInput>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Default: Story = {
  args: { placeholder: 'Enter text...' },
}

export const WithLabel: Story = {
  args: { label: 'Email Address', placeholder: 'you@example.com' },
}

export const ErrorState: Story = {
  args: {
    error: true,
    errorMessage: 'This field is required',
    placeholder: 'Enter text...',
  },
}

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Disabled input' },
}

export const SmallSize: Story = {
  args: { size: 'sm', placeholder: 'Small input' },
}

export const AllStates: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-cn-6 max-w-lg">
      <CnInput label="Default" placeholder="Type here..." />
      <CnInput label="With value" defaultValue="Hello world" />
      <CnInput label="Error" error errorMessage="This field is required" placeholder="Invalid..." />
      <CnInput label="Disabled" disabled placeholder="Disabled" />
    </div>
  ),
}
