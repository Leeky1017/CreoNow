import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('bg-muted rounded-md animate-pulse', className)}
      {...props}
    />
  );
}
Skeleton.displayName = 'Skeleton';
