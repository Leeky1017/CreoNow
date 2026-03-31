import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  CnTooltipProvider,
  CnTooltip,
  CnTooltipTrigger,
  CnTooltipContent,
} from '@/components/ui/cn-tooltip'

describe('CnTooltip', () => {
  const TestTooltip = () => (
    <CnTooltipProvider delay={0}>
      <CnTooltip>
        <CnTooltipTrigger>Hover me</CnTooltipTrigger>
        <CnTooltipContent>Tooltip text</CnTooltipContent>
      </CnTooltip>
    </CnTooltipProvider>
  )

  it('shows tooltip content on hover', async () => {
    const user = userEvent.setup()
    render(<TestTooltip />)
    await user.hover(screen.getByText('Hover me'))
    expect(await screen.findByText('Tooltip text')).toBeInTheDocument()
  })

  it('hides tooltip content after unhover', async () => {
    const user = userEvent.setup()
    render(<TestTooltip />)

    const trigger = screen.getByText('Hover me')
    await user.hover(trigger)
    expect(await screen.findByText('Tooltip text')).toBeInTheDocument()

    await user.unhover(trigger)
    await waitFor(() => {
      expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument()
    })
  })
})
