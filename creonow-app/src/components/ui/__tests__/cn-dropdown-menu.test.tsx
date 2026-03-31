import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  CnDropdownMenu,
  CnDropdownMenuTrigger,
  CnDropdownMenuContent,
  CnDropdownMenuItem,
} from '@/components/ui/cn-dropdown-menu'

function TestMenu() {
  return (
    <CnDropdownMenu>
      <CnDropdownMenuTrigger>Open menu</CnDropdownMenuTrigger>
      <CnDropdownMenuContent>
        <CnDropdownMenuItem>Item 1</CnDropdownMenuItem>
        <CnDropdownMenuItem>Item 2</CnDropdownMenuItem>
      </CnDropdownMenuContent>
    </CnDropdownMenu>
  )
}

describe('CnDropdownMenu', () => {
  it('opens menu when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<TestMenu />)
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(await screen.findByText('Item 1')).toBeInTheDocument()
  })

  it('renders all menu items', async () => {
    const user = userEvent.setup()
    render(<TestMenu />)
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(await screen.findByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })

  it('closes menu after clicking an item', async () => {
    const user = userEvent.setup()
    render(<TestMenu />)
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(await screen.findByText('Item 1')).toBeInTheDocument()

    await user.click(screen.getByText('Item 1'))
    await waitFor(() => {
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
    })
  })
})
