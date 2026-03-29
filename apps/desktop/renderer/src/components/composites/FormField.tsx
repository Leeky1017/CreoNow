import type { ReactNode } from 'react';

export interface FormFieldProps {
  label: string;
  description?: string;
  htmlFor?: string;
  children: ReactNode;
}

export function FormField({ label, description, htmlFor, children }: FormFieldProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <label
          htmlFor={htmlFor}
          className="text-sm text-foreground"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
