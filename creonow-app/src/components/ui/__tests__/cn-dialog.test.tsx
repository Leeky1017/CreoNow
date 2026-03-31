import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  CnDialog,
  CnDialogTrigger,
  CnDialogContent,
  CnDialogHeader,
  CnDialogTitle,
  CnDialogDescription,
  CnDialogBody,
  CnDialogFooter,
  CnDialogClose,
} from '@/components/ui/cn-dialog'

function TestDialog() {
  return (
    <CnDialog>
      <CnDialogTrigger>Open</CnDialogTrigger>
      <CnDialogContent>
        <CnDialogHeader>
          <CnDialogTitle>Test Title</CnDialogTitle>
          <CnDialogDescription>Test Description</CnDialogDescription>
        </CnDialogHeader>
        <CnDialogBody>Body content</CnDialogBody>
        <CnDialogFooter>
          <CnDialogClose>Close</CnDialogClose>
        </CnDialogFooter>
      </CnDialogContent>
    </CnDialog>
  )
}

describe('CnDialog', () => {
  it('opens when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<TestDialog />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(await screen.findByText('Test Title')).toBeInTheDocument()
  })

  it('closes when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<TestDialog />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(await screen.findByText('Test Title')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => {
      expect(screen.queryByText('Test Title')).not.toBeInTheDocument()
    })
  })

  it('renders title, description, and body content', async () => {
    const user = userEvent.setup()
    render(<TestDialog />)
    await user.click(screen.getByRole('button', { name: 'Open' }))

    expect(await screen.findByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })
})
