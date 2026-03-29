import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-card rounded-xl border border-border p-0', className)}
      {...props}
    />
  );
}
Card.displayName = 'Card';

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 pb-0', className)} {...props} />;
}
CardHeader.displayName = 'CardHeader';

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold text-foreground', className)}
      {...props}
    />
  );
}
CardTitle.displayName = 'CardTitle';

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}
CardDescription.displayName = 'CardDescription';

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />;
}
CardContent.displayName = 'CardContent';

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center p-4 pt-0', className)}
      {...props}
    />
  );
}
CardFooter.displayName = 'CardFooter';
