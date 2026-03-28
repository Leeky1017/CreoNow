import * as SwitchPrimitive from '@radix-ui/react-switch';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

export interface SwitchProps
  extends ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full',
        'border-2 border-transparent',
        'transition-colors duration-fast ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=unchecked]:bg-muted-foreground/30',
        'data-[state=checked]:bg-accent',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-foreground shadow-sm',
          'transition-transform duration-fast ease-out',
          'data-[state=unchecked]:translate-x-0',
          'data-[state=checked]:translate-x-4',
        )}
      />
    </SwitchPrimitive.Root>
  ),
);

Switch.displayName = 'Switch';
