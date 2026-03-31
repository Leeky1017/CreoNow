import type { Meta, StoryObj } from '@storybook/react'
import LayoutShell from '@/components/layout/layout-shell'

const meta: Meta<typeof LayoutShell> = {
  title: 'Layout/LayoutShell',
  component: LayoutShell,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof LayoutShell>

export const Default: Story = {}
