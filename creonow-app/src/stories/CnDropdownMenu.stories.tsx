import type { Meta, StoryObj } from '@storybook/react'
import {
  CnDropdownMenu,
  CnDropdownMenuTrigger,
  CnDropdownMenuContent,
  CnDropdownMenuItem,
  CnDropdownMenuSeparator,
  CnDropdownMenuLabel,
  CnDropdownMenuShortcut,
} from '@/components/ui/cn-dropdown-menu'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { CnButton } from '@/components/ui/cn-button'
import { Pencil, Copy, Archive, FolderOpen, Trash2, MoreHorizontal } from 'lucide-react'

const meta: Meta<typeof CnDropdownMenu> = {
  title: 'UI/CnDropdownMenu',
  component: CnDropdownMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof CnDropdownMenu>

export const Default: Story = {
  render: () => (
    <CnDropdownMenu>
      <CnDropdownMenuTrigger>
        <CnButton variant="ghost" size="md">
          Options
        </CnButton>
      </CnDropdownMenuTrigger>
      <CnDropdownMenuContent>
        <MenuPrimitive.Group>
          <CnDropdownMenuLabel>Actions</CnDropdownMenuLabel>
          <CnDropdownMenuItem>
            <Pencil />
            Edit
            <CnDropdownMenuShortcut>⌘E</CnDropdownMenuShortcut>
          </CnDropdownMenuItem>
          <CnDropdownMenuItem>
            <Copy />
            Duplicate
            <CnDropdownMenuShortcut>⌘D</CnDropdownMenuShortcut>
          </CnDropdownMenuItem>
          <CnDropdownMenuItem>
            <Archive />
            Archive
          </CnDropdownMenuItem>
        </MenuPrimitive.Group>
        <CnDropdownMenuSeparator />
        <CnDropdownMenuItem>
          <FolderOpen />
          Move to...
        </CnDropdownMenuItem>
        <CnDropdownMenuItem variant="danger">
          <Trash2 />
          Delete
        </CnDropdownMenuItem>
      </CnDropdownMenuContent>
    </CnDropdownMenu>
  ),
}

export const SimpleMenu: Story = {
  render: () => (
    <CnDropdownMenu>
      <CnDropdownMenuTrigger>
        <CnButton variant="ghost" size="sm">
          <MoreHorizontal />
        </CnButton>
      </CnDropdownMenuTrigger>
      <CnDropdownMenuContent>
        <CnDropdownMenuItem>New file</CnDropdownMenuItem>
        <CnDropdownMenuItem>Open recent</CnDropdownMenuItem>
        <CnDropdownMenuItem>Save</CnDropdownMenuItem>
        <CnDropdownMenuSeparator />
        <CnDropdownMenuItem>Export</CnDropdownMenuItem>
        <CnDropdownMenuItem>Print</CnDropdownMenuItem>
      </CnDropdownMenuContent>
    </CnDropdownMenu>
  ),
}

export const WithDangerItem: Story = {
  render: () => (
    <CnDropdownMenu>
      <CnDropdownMenuTrigger>
        <CnButton variant="ghost" size="md">
          Manage
        </CnButton>
      </CnDropdownMenuTrigger>
      <CnDropdownMenuContent>
        <CnDropdownMenuItem>
          <Pencil />
          Rename
        </CnDropdownMenuItem>
        <CnDropdownMenuItem>
          <Archive />
          Archive
        </CnDropdownMenuItem>
        <CnDropdownMenuSeparator />
        <CnDropdownMenuItem variant="danger">
          <Trash2 />
          Delete permanently
        </CnDropdownMenuItem>
      </CnDropdownMenuContent>
    </CnDropdownMenu>
  ),
}
