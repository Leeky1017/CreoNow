import * as TogglePrimitive from '@radix-ui/react-toggle';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

const variantStyles = {
  default: 'bg-transparent hover:bg-muted',
  outline: 'border border-border bg-transparent hover:bg-muted',
} as const;

export type ToggleVariant = keyof typeof variantStyles;

export interface ToggleProps
  extends ComponentPropsWithoutRef<typeof TogglePrimitive.Root> {
  variant?: ToggleVariant;
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ variant = 'default', className, ...props }, ref) => (
    <TogglePrimitive.Root
      ref={ref}
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium',
        'text-muted-foreground',
        'transition-colors duration-fast ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=on]:bg-accent-subtle data-[state=on]:text-accent',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  ),
);

Toggle.displayName = 'Toggle';
