'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  CnDialog — Root                                                    */
/* ------------------------------------------------------------------ */

export type CnDialogProps = DialogPrimitive.Root.Props

function CnDialog({ ...props }: CnDialogProps) {
  return <DialogPrimitive.Root data-slot="cn-dialog" {...props} />
}

/* ------------------------------------------------------------------ */
/*  CnDialogTrigger                                                    */
/* ------------------------------------------------------------------ */

export type CnDialogTriggerProps = DialogPrimitive.Trigger.Props

function CnDialogTrigger({ ...props }: CnDialogTriggerProps) {
  return <DialogPrimitive.Trigger data-slot="cn-dialog-trigger" {...props} />
}

/* ------------------------------------------------------------------ */
/*  CnDialogContent — Portal + Backdrop + Popup                       */
/* ------------------------------------------------------------------ */

export interface CnDialogContentProps extends DialogPrimitive.Popup.Props {
  showCloseButton?: boolean
}

function CnDialogContent({
  className,
  children,
  showCloseButton = false,
  ...props
}: CnDialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      {/* Overlay / Backdrop */}
      <DialogPrimitive.Backdrop
        data-slot="cn-dialog-overlay"
        className={cn(
          'fixed inset-0 bg-cn-overlay z-[var(--cn-z-overlay)]',
          'duration-200',
          'data-open:animate-in data-open:fade-in-0',
          'data-closed:animate-out data-closed:fade-out-0'
        )}
      />

      {/* Popup / Content */}
      <DialogPrimitive.Popup
        data-slot="cn-dialog-content"
        className={cn(
          'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'z-[var(--cn-z-modal)]',
          'w-full max-w-[480px]',
          'bg-cn-bg-surface rounded-cn-md shadow-cn-overlay',
          'border border-cn-separator',
          'outline-none',
          'duration-200',
          'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:slide-in-from-bottom-2',
          'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:slide-out-to-bottom-2',
          className
        )}
        {...props}
      >
        {children}

        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="cn-dialog-close-x"
            className={cn(
              'absolute top-cn-3 right-cn-3',
              'rounded-cn-sm p-cn-1',
              'text-cn-text-tertiary',
              'hover:text-cn-text-primary hover:bg-cn-bg-hover',
              'transition-colors duration-[120ms]',
              'cursor-pointer'
            )}
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

/* ------------------------------------------------------------------ */
/*  CnDialogHeader                                                     */
/* ------------------------------------------------------------------ */

export type CnDialogHeaderProps = React.ComponentProps<'div'>

function CnDialogHeader({ className, ...props }: CnDialogHeaderProps) {
  return (
    <div
      data-slot="cn-dialog-header"
      className={cn('flex flex-col gap-cn-1 px-cn-6 pt-cn-4 pb-cn-3', className)}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  CnDialogTitle                                                      */
/* ------------------------------------------------------------------ */

export type CnDialogTitleProps = DialogPrimitive.Title.Props

function CnDialogTitle({ className, ...props }: CnDialogTitleProps) {
  return (
    <DialogPrimitive.Title
      data-slot="cn-dialog-title"
      className={cn('text-cn-base font-semibold text-cn-text-primary', className)}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  CnDialogDescription                                                */
/* ------------------------------------------------------------------ */

export type CnDialogDescriptionProps = DialogPrimitive.Description.Props

function CnDialogDescription({ className, ...props }: CnDialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      data-slot="cn-dialog-description"
      className={cn('text-cn-sm text-cn-text-secondary', className)}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  CnDialogBody                                                       */
/* ------------------------------------------------------------------ */

export interface CnDialogBodyProps extends React.ComponentProps<'div'> {
  scrollable?: boolean
}

function CnDialogBody({ className, scrollable = false, ...props }: CnDialogBodyProps) {
  return (
    <div
      data-slot="cn-dialog-body"
      className={cn(
        'px-cn-6 py-cn-4 text-cn-sm text-cn-text-secondary',
        scrollable &&
          'max-h-[300px] overflow-y-auto [mask-image:linear-gradient(to_bottom,black_calc(100%-24px),transparent)]',
        className
      )}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  CnDialogFooter                                                     */
/* ------------------------------------------------------------------ */

export type CnDialogFooterProps = React.ComponentProps<'div'>

function CnDialogFooter({ className, ...props }: CnDialogFooterProps) {
  return (
    <div
      data-slot="cn-dialog-footer"
      className={cn(
        'flex justify-end gap-cn-3 px-cn-6 pt-cn-3 pb-cn-4',
        'border-t border-cn-separator',
        className
      )}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  CnDialogClose                                                      */
/* ------------------------------------------------------------------ */

export type CnDialogCloseProps = DialogPrimitive.Close.Props

function CnDialogClose({ ...props }: CnDialogCloseProps) {
  return <DialogPrimitive.Close data-slot="cn-dialog-close" {...props} />
}

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export {
  CnDialog,
  CnDialogTrigger,
  CnDialogContent,
  CnDialogHeader,
  CnDialogTitle,
  CnDialogDescription,
  CnDialogBody,
  CnDialogFooter,
  CnDialogClose,
}
