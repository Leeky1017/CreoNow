import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

function BaseDialogHarness() {
  return (
    <Dialog>
      <DialogTrigger>Open dialog</DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>Dialog description</DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BaseMenuHarness() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel inset>Actions</DropdownMenuLabel>
          <DropdownMenuItem inset>
            Rename
            <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem checked>Track changes</DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value="novel">
            <DropdownMenuRadioItem value="novel">Novel</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="screenplay">Screenplay</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger inset>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

describe('primitive ui components', () => {
  it('renders Button variants and forwards classes', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(
      <Button variant="outline" size="icon-sm" className="custom-class" onClick={handleClick}>
        Go
      </Button>
    )

    const button = screen.getByRole('button', { name: 'Go' })
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button).toHaveClass('custom-class')

    await user.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('opens and closes Dialog using footer close action', async () => {
    const user = userEvent.setup()

    render(<BaseDialogHarness />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    expect(await screen.findByText('Dialog title')).toBeInTheDocument()
    expect(screen.getByText('Dialog description')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => {
      expect(screen.queryByText('Dialog title')).not.toBeInTheDocument()
    })
  })

  it('renders DropdownMenu primitives including submenu helpers', async () => {
    const user = userEvent.setup()

    render(<BaseMenuHarness />)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    expect(await screen.findByText('Actions')).toBeInTheDocument()
    expect(screen.getByText('Rename')).toBeInTheDocument()
    expect(screen.getByText('⌘R')).toBeInTheDocument()
    expect(screen.getByText('Track changes')).toBeInTheDocument()
    expect(screen.getByText('Novel')).toBeInTheDocument()
    expect(screen.getByText('Screenplay')).toBeInTheDocument()
    expect(screen.getByText('More')).toBeInTheDocument()
  })

  it('shows tooltip content with provider defaults', async () => {
    const user = userEvent.setup()

    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent side="bottom">Tooltip content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )

    await user.hover(screen.getByText('Hover me'))
    expect(await screen.findByText('Tooltip content')).toBeInTheDocument()
  })
})
