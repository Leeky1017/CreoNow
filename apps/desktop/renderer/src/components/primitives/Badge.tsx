import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const variantStyles = {
  default: 'bg-muted text-muted-foreground',
  accent: 'bg-accent-subtle text-accent',
  destructive: 'bg-destructive/10 text-destructive',
  outline: 'border border-border bg-transparent text-foreground',
} as const;

export type BadgeVariant = keyof typeof variantStyles;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  variant = 'default',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        'transition-colors duration-fast ease-out',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
