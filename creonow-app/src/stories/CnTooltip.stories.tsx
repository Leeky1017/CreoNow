import type { Meta, StoryObj } from '@storybook/react'
import {
  CnTooltipProvider,
  CnTooltip,
  CnTooltipTrigger,
  CnTooltipContent,
} from '@/components/ui/cn-tooltip'
import { CnButton } from '@/components/ui/cn-button'

const meta = {
  title: 'UI/CnTooltip',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <CnTooltipProvider>
        <div className="p-cn-8">
          <Story />
        </div>
      </CnTooltipProvider>
    ),
  ],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/*  Default                                                            */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  render: () => (
    <CnTooltip>
      <CnTooltipTrigger render={<CnButton variant="ghost">Hover me</CnButton>} />
      <CnTooltipContent>This is a tooltip</CnTooltipContent>
    </CnTooltip>
  ),
}

/* ------------------------------------------------------------------ */
/*  AllDirections                                                      */
/* ------------------------------------------------------------------ */

export const AllDirections: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-cn-6 p-cn-8">
      <CnTooltip>
        <CnTooltipTrigger render={<CnButton variant="ghost">Top</CnButton>} />
        <CnTooltipContent side="top">Tooltip on top</CnTooltipContent>
      </CnTooltip>

      <CnTooltip>
        <CnTooltipTrigger render={<CnButton variant="ghost">Bottom</CnButton>} />
        <CnTooltipContent side="bottom">Tooltip on bottom</CnTooltipContent>
      </CnTooltip>

      <CnTooltip>
        <CnTooltipTrigger render={<CnButton variant="ghost">Left</CnButton>} />
        <CnTooltipContent side="left">Tooltip on left</CnTooltipContent>
      </CnTooltip>

      <CnTooltip>
        <CnTooltipTrigger render={<CnButton variant="ghost">Right</CnButton>} />
        <CnTooltipContent side="right">Tooltip on right</CnTooltipContent>
      </CnTooltip>
    </div>
  ),
}

/* ------------------------------------------------------------------ */
/*  LongText                                                           */
/* ------------------------------------------------------------------ */

export const LongText: Story = {
  render: () => (
    <CnTooltip>
      <CnTooltipTrigger render={<CnButton variant="ghost">Hover for long tooltip</CnButton>} />
      <CnTooltipContent>
        This is a longer tooltip message that demonstrates automatic text wrapping when the content
        exceeds the maximum width.
      </CnTooltipContent>
    </CnTooltip>
  ),
}

/* ------------------------------------------------------------------ */
/*  CustomDelay                                                        */
/* ------------------------------------------------------------------ */

export const CustomDelay: Story = {
  render: () => (
    <CnTooltipProvider delay={100}>
      <CnTooltip>
        <CnTooltipTrigger render={<CnButton variant="ghost">Quick tooltip (100ms)</CnButton>} />
        <CnTooltipContent>This tooltip appears faster</CnTooltipContent>
      </CnTooltip>
    </CnTooltipProvider>
  ),
}
