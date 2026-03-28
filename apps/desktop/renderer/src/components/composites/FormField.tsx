import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FormFieldProps {
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, description, error, children, className }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm text-foreground">{label}</label>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div>{children}</div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
