import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  errorMessage?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, errorMessage, disabled, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        <textarea
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full rounded-lg border bg-input px-3 py-2 text-sm text-foreground',
            'min-h-[80px] resize-y',
            'placeholder:text-muted-foreground',
            'transition-colors duration-fast ease-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-destructive focus-visible:ring-destructive/30'
              : 'border-border hover:border-muted-foreground/30',
            className,
          )}
          aria-invalid={error || undefined}
          aria-describedby={error && errorMessage ? `${props.id}-error` : undefined}
          {...props}
        />
        {error && errorMessage && (
          <p
            id={props.id ? `${props.id}-error` : undefined}
            className="text-xs text-destructive"
          >
            {errorMessage}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
