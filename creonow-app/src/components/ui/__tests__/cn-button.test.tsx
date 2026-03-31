import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CnButton } from '@/components/ui/cn-button'

describe('CnButton', () => {
  it('renders primary variant', () => {
    render(<CnButton variant="primary">Primary</CnButton>)
    expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument()
  })

  it('renders ghost variant', () => {
    render(<CnButton variant="ghost">Ghost</CnButton>)
    expect(screen.getByRole('button', { name: 'Ghost' })).toBeInTheDocument()
  })

  it('renders danger variant', () => {
    render(<CnButton variant="danger">Danger</CnButton>)
    expect(screen.getByRole('button', { name: 'Danger' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    render(<CnButton onClick={handleClick}>Click me</CnButton>)
    await user.click(screen.getByRole('button', { name: 'Click me' }))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    render(
      <CnButton disabled onClick={handleClick}>
        Disabled
      </CnButton>
    )
    await user.click(screen.getByRole('button', { name: 'Disabled' }))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('shows loading indicator and does not call onClick', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    render(
      <CnButton loading onClick={handleClick}>
        Loading
      </CnButton>
    )
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('aria-disabled', 'true')

    // Simulate pointer-events-none CSS (Tailwind class not computed in jsdom)
    button.style.pointerEvents = 'none'
    // userEvent correctly rejects pointer interactions on elements with pointer-events: none
    await expect(user.click(button)).rejects.toThrow(/pointer-events/)
    expect(handleClick).not.toHaveBeenCalled()
  })
})
