import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

const sizeStyles = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
} as const;

export type AvatarSize = keyof typeof sizeStyles;

export interface AvatarProps extends ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  size?: AvatarSize;
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  ({ size = 'md', className, ...props }, ref) => (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full',
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  ),
);
Avatar.displayName = 'Avatar';

export const AvatarImage = forwardRef<
  HTMLImageElement,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = 'AvatarImage';

export const AvatarFallback = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full',
      'bg-muted text-muted-foreground font-medium',
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = 'AvatarFallback';
