import type { Meta, StoryObj } from '@storybook/react'

function Introduction() {
  return (
    <div className="p-cn-8 max-w-lg">
      <h1 className="text-cn-lg font-semibold text-cn-text-primary mb-cn-4">
        CreoNow Design System
      </h1>
      <p className="text-cn-sm text-cn-text-secondary mb-cn-6">
        Agent-native creative writing IDE. Extreme minimalism meets creative power.
      </p>
      <div className="flex gap-cn-2">
        <div className="w-16 h-16 rounded-cn-md bg-cn-accent" />
        <div className="w-16 h-16 rounded-cn-md bg-cn-bg-hover border border-cn-border-default" />
        <div className="w-16 h-16 rounded-cn-md bg-cn-danger" />
      </div>
    </div>
  )
}

const meta = {
  title: 'Introduction',
  component: Introduction,
} satisfies Meta<typeof Introduction>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
