import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

export type RadioGroupProps = ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>;

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, ...props }, ref) => (
    <RadioGroupPrimitive.Root
      ref={ref}
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  ),
);
RadioGroup.displayName = 'RadioGroup';

export const RadioGroupItem = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'aspect-square h-4 w-4 rounded-full border border-border',
      'transition-all duration-fast ease-out',
      'hover:border-muted-foreground/50',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:border-accent',
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <span className="h-2 w-2 rounded-full bg-accent" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = 'RadioGroupItem';
