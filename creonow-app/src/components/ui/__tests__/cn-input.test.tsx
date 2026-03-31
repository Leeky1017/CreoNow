import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CnInput } from '@/components/ui/cn-input'

describe('CnInput', () => {
  it('renders an input element', () => {
    render(<CnInput />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders a label associated with the input', () => {
    render(<CnInput label="Username" />)
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
  })

  it('handles text input and triggers onChange', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()
    render(<CnInput onChange={handleChange} />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'hello')
    expect(handleChange).toHaveBeenCalled()
    expect(input).toHaveValue('hello')
  })

  it('shows error message when error and errorMessage are set', () => {
    render(<CnInput error errorMessage="This field is required" />)
    expect(screen.getByText('This field is required')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('is disabled when disabled prop is set', () => {
    render(<CnInput disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})
