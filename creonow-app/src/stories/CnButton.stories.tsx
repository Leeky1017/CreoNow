import type { Meta, StoryObj } from '@storybook/react'
import { CnButton } from '@/components/ui/cn-button'

const variants = ['primary', 'ghost', 'danger'] as const
const sizes = ['sm', 'md', 'lg'] as const

const meta = {
  title: 'UI/CnButton',
  component: CnButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [...variants],
    },
    size: {
      control: 'select',
      options: [...sizes],
    },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
  args: {
    children: 'Button',
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
  },
} satisfies Meta<typeof CnButton>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-cn-4 items-end">
      {variants.map((v) =>
        sizes.map((s) => (
          <CnButton key={`${v}-${s}`} variant={v} size={s}>
            {v} {s}
          </CnButton>
        ))
      )}
    </div>
  ),
}

export const DisabledStates: Story = {
  render: () => (
    <div className="flex gap-cn-4 items-center">
      {variants.map((v) => (
        <CnButton key={v} variant={v} disabled>
          {v}
        </CnButton>
      ))}
    </div>
  ),
}

export const LoadingStates: Story = {
  render: () => (
    <div className="flex gap-cn-4 items-center">
      {variants.map((v) => (
        <CnButton key={v} variant={v} loading>
          {v}
        </CnButton>
      ))}
    </div>
  ),
}

export const Primary: Story = {
  args: { variant: 'primary', children: 'Primary Button' },
}

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Ghost Button' },
}

export const Danger: Story = {
  args: { variant: 'danger', children: 'Danger Button' },
}
