import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LayoutShell from '@/components/layout/layout-shell'
import { useLayoutStore } from '@/stores/layout-store'
import { useThemeStore } from '@/stores/theme-store'

function resetStores() {
  useLayoutStore.setState({
    leftPanelOpen: true,
    rightPanelOpen: true,
  })
  useThemeStore.setState({
    theme: 'light',
  })
  document.documentElement.classList.remove('dark')
}

describe('LayoutShell', () => {
  beforeEach(() => {
    resetStores()
  })

  it('renders core panels and allows choosing a file from the left panel', async () => {
    const user = userEvent.setup()

    render(<LayoutShell />)

    expect(screen.getByText('文件')).toBeInTheDocument()
    expect(screen.getAllByText('第三章·风起').length).toBeGreaterThan(0)
    expect(screen.getByText('续写第三章·景象描写')).toBeInTheDocument()
    expect(screen.getByText('字数：2,847')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '第四章·暗流.md' }))
    expect(screen.getByRole('button', { name: '第四章·暗流.md' })).toHaveClass('bg-cn-bg-selected')
  })

  it('toggles layout panels from icon bar and keyboard shortcuts', async () => {
    const user = userEvent.setup()

    render(<LayoutShell />)

    await user.click(screen.getByRole('button', { name: 'Files' }))
    expect(useLayoutStore.getState().leftPanelOpen).toBe(false)

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }))
    })
    await waitFor(() => {
      expect(useLayoutStore.getState().leftPanelOpen).toBe(true)
    })

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true }))
    })
    await waitFor(() => {
      expect(useLayoutStore.getState().rightPanelOpen).toBe(false)
    })
  })

  it('opens the agent panel from FAB and toggles theme from status bar', async () => {
    const user = userEvent.setup()

    useLayoutStore.setState({ rightPanelOpen: false })
    const { container } = render(<LayoutShell />)

    const fab = container.querySelector('button.fixed')
    expect(fab).toBeInstanceOf(HTMLButtonElement)
    await user.click(fab as HTMLButtonElement)
    expect(useLayoutStore.getState().rightPanelOpen).toBe(true)

    const themeToggle = screen.getByText('长篇模式').parentElement?.querySelector('button')
    expect(themeToggle).toBeInstanceOf(HTMLButtonElement)

    await user.click(themeToggle as HTMLButtonElement)
    expect(useThemeStore.getState().theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
