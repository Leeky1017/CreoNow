import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { forwardRef, type ComponentPropsWithoutRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogOverlay = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=open]:fade-in-0',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      className,
    )}
    {...props}
  />
));
AlertDialogOverlay.displayName = 'AlertDialogOverlay';

export const AlertDialogContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
        'bg-modal rounded-xl border border-border shadow-(--shadow-xl) p-6',
        'transition-all duration-fast ease-out',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        className,
      )}
      {...props}
    />
  </AlertDialogPrimitive.Portal>
));
AlertDialogContent.displayName = 'AlertDialogContent';

export function AlertDialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1.5 text-center sm:text-left', className)}
      {...props}
    />
  );
}
AlertDialogHeader.displayName = 'AlertDialogHeader';

export const AlertDialogTitle = forwardRef<
  HTMLHeadingElement,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
));
AlertDialogTitle.displayName = 'AlertDialogTitle';

export const AlertDialogDescription = forwardRef<
  HTMLParagraphElement,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
AlertDialogDescription.displayName = 'AlertDialogDescription';

export function AlertDialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-4 flex justify-end gap-2', className)}
      {...props}
    />
  );
}
AlertDialogFooter.displayName = 'AlertDialogFooter';

export const AlertDialogAction = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-md px-4 h-9 text-sm font-medium',
      'bg-destructive text-destructive-foreground hover:brightness-110 active:brightness-90',
      'transition-all duration-fast ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      className,
    )}
    {...props}
  />
));
AlertDialogAction.displayName = 'AlertDialogAction';

export const AlertDialogCancel = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-md px-4 h-9 text-sm font-medium',
      'border border-border bg-transparent text-foreground hover:bg-muted',
      'transition-all duration-fast ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      className,
    )}
    {...props}
  />
));
AlertDialogCancel.displayName = 'AlertDialogCancel';
