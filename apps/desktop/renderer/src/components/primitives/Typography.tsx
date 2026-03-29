import { forwardRef, type HTMLAttributes, type ElementType } from 'react';
import { cn } from '@/lib/cn';

/* ── Heading ─────────────────────────────────────────── */

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const headingSizes: Record<HeadingLevel, string> = {
  h1: 'text-2xl',
  h2: 'text-xl',
  h3: 'text-lg',
  h4: 'text-base',
  h5: 'text-sm',
  h6: 'text-xs',
};

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingLevel;
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ as: Tag = 'h2', className, ...props }, ref) => (
    <Tag
      ref={ref}
      className={cn('font-bold text-foreground', headingSizes[Tag], className)}
      {...props}
    />
  ),
);
Heading.displayName = 'Heading';

/* ── Text ────────────────────────────────────────────── */

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  as?: ElementType;
}

export const Text = forwardRef<HTMLParagraphElement, TextProps>(
  ({ as: Comp = 'p', className, ...props }, ref) => (
    <Comp
      ref={ref}
      className={cn('text-sm text-foreground', className)}
      {...props}
    />
  ),
);
Text.displayName = 'Text';

/* ── Caption ─────────────────────────────────────────── */

export interface CaptionProps extends HTMLAttributes<HTMLSpanElement> {}

export const Caption = forwardRef<HTMLSpanElement, CaptionProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  ),
);
Caption.displayName = 'Caption';
