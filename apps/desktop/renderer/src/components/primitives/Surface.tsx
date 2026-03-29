import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const variantStyles = {
  default: 'bg-surface border border-border rounded-xl',
  elevated: 'bg-surface border border-border rounded-xl shadow-(--shadow-md)',
  inset: 'bg-surface-inset rounded-xl',
} as const;

export type SurfaceVariant = keyof typeof variantStyles;

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  ({ variant = 'default', className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(variantStyles[variant], className)}
      {...props}
    />
  ),
);
Surface.displayName = 'Surface';
