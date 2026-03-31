'use client'

import { forwardRef } from 'react'
import * as React from 'react'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/*  Props Interfaces                                                          */
/* -------------------------------------------------------------------------- */

export type CnDropdownMenuProps = MenuPrimitive.Root.Props

export type CnDropdownMenuTriggerProps = MenuPrimitive.Trigger.Props

export interface CnDropdownMenuContentProps
  extends
    MenuPrimitive.Popup.Props,
    Pick<MenuPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'> {}

export interface CnDropdownMenuItemProps extends MenuPrimitive.Item.Props {
  variant?: 'default' | 'danger'
}

export type CnDropdownMenuSeparatorProps = MenuPrimitive.Separator.Props

export type CnDropdownMenuLabelProps = MenuPrimitive.GroupLabel.Props

export type CnDropdownMenuShortcutProps = React.ComponentPropsWithRef<'span'>

/* -------------------------------------------------------------------------- */
/*  Root                                                                      */
/* -------------------------------------------------------------------------- */

function CnDropdownMenu({ ...props }: CnDropdownMenuProps) {
  return <MenuPrimitive.Root data-slot="cn-dropdown-menu" {...props} />
}

/* -------------------------------------------------------------------------- */
/*  Trigger                                                                   */
/* -------------------------------------------------------------------------- */

const CnDropdownMenuTrigger = forwardRef<HTMLButtonElement, CnDropdownMenuTriggerProps>(
  ({ className, ...props }, ref) => (
    <MenuPrimitive.Trigger
      ref={ref}
      data-slot="cn-dropdown-menu-trigger"
      className={cn('outline-none', className)}
      {...props}
    />
  )
)
CnDropdownMenuTrigger.displayName = 'CnDropdownMenuTrigger'

/* -------------------------------------------------------------------------- */
/*  Content (Portal > Positioner > Popup)                                     */
/* -------------------------------------------------------------------------- */

const CnDropdownMenuContent = forwardRef<HTMLDivElement, CnDropdownMenuContentProps>(
  (
    { align = 'start', alignOffset = 0, side = 'bottom', sideOffset = 4, className, ...props },
    ref
  ) => (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-[var(--cn-z-dropdown)] outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          ref={ref}
          data-slot="cn-dropdown-menu-content"
          className={cn(
            'min-w-[200px] origin-(--transform-origin) overflow-hidden',
            'bg-cn-bg-surface rounded-cn-md shadow-cn-float',
            'border border-cn-separator p-cn-1',
            'z-[var(--cn-z-dropdown)]',
            'outline-none',
            // open
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:slide-in-from-top-1',
            // closed
            'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            'duration-[120ms]',
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
)
CnDropdownMenuContent.displayName = 'CnDropdownMenuContent'

/* -------------------------------------------------------------------------- */
/*  Item                                                                      */
/* -------------------------------------------------------------------------- */

const CnDropdownMenuItem = forwardRef<HTMLDivElement, CnDropdownMenuItemProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <MenuPrimitive.Item
      ref={ref}
      data-slot="cn-dropdown-menu-item"
      data-variant={variant}
      className={cn(
        'h-9 flex items-center gap-cn-2 px-cn-3',
        'rounded-cn-sm text-cn-sm cursor-default select-none outline-none',
        // icons
        '[&_svg]:size-4 [&_svg]:shrink-0',
        // default variant
        variant === 'default' && [
          'text-cn-text-primary',
          'focus:bg-cn-bg-hover',
          'active:bg-cn-bg-hover',
        ],
        // danger variant
        variant === 'danger' && [
          'text-cn-danger',
          'focus:bg-cn-danger-bg focus:text-cn-danger',
          'active:bg-cn-danger-bg',
        ],
        // disabled
        'data-disabled:opacity-50 data-disabled:pointer-events-none',
        className
      )}
      {...props}
    />
  )
)
CnDropdownMenuItem.displayName = 'CnDropdownMenuItem'

/* -------------------------------------------------------------------------- */
/*  Separator                                                                 */
/* -------------------------------------------------------------------------- */

const CnDropdownMenuSeparator = forwardRef<HTMLDivElement, CnDropdownMenuSeparatorProps>(
  ({ className, ...props }, ref) => (
    <MenuPrimitive.Separator
      ref={ref}
      data-slot="cn-dropdown-menu-separator"
      className={cn('h-px bg-cn-separator -mx-cn-1 my-cn-1', className)}
      {...props}
    />
  )
)
CnDropdownMenuSeparator.displayName = 'CnDropdownMenuSeparator'

/* -------------------------------------------------------------------------- */
/*  Label (rendered inside a MenuPrimitive.Group)                             */
/* -------------------------------------------------------------------------- */

const CnDropdownMenuLabel = forwardRef<HTMLDivElement, CnDropdownMenuLabelProps>(
  ({ className, ...props }, ref) => (
    <MenuPrimitive.GroupLabel
      ref={ref}
      data-slot="cn-dropdown-menu-label"
      className={cn('px-cn-3 py-cn-1 text-cn-xs font-medium text-cn-text-tertiary', className)}
      {...props}
    />
  )
)
CnDropdownMenuLabel.displayName = 'CnDropdownMenuLabel'

/* -------------------------------------------------------------------------- */
/*  Shortcut                                                                  */
/* -------------------------------------------------------------------------- */

const CnDropdownMenuShortcut = forwardRef<HTMLSpanElement, CnDropdownMenuShortcutProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="cn-dropdown-menu-shortcut"
      className={cn('ml-auto text-cn-xs text-cn-text-tertiary opacity-40', className)}
      {...props}
    />
  )
)
CnDropdownMenuShortcut.displayName = 'CnDropdownMenuShortcut'

/* -------------------------------------------------------------------------- */
/*  Exports                                                                   */
/* -------------------------------------------------------------------------- */

export {
  CnDropdownMenu,
  CnDropdownMenuTrigger,
  CnDropdownMenuContent,
  CnDropdownMenuItem,
  CnDropdownMenuSeparator,
  CnDropdownMenuLabel,
  CnDropdownMenuShortcut,
}
