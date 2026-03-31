'use client'

import { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

export interface CnInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md'
  error?: boolean
  errorMessage?: string
  label?: string
}

const CnInput = forwardRef<HTMLInputElement, CnInputProps>(
  (
    {
      size = 'md',
      error = false,
      errorMessage,
      disabled = false,
      label,
      className,
      id: idProp,
      ...props
    },
    ref
  ) => {
    const autoId = useId()
    const inputId = idProp ?? autoId
    const errorId = error && errorMessage ? `${inputId}-error` : undefined

    const sizeClasses = {
      sm: 'h-8 text-cn-xs',
      md: 'h-9 text-cn-sm',
    } as const

    return (
      <div className="flex flex-col">
        {label && (
          <label
            htmlFor={inputId}
            className="text-cn-sm font-medium font-cn-ui text-cn-text-primary mb-[6px]"
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error || undefined}
          aria-describedby={errorId}
          className={cn(
            'w-full border bg-transparent px-cn-3 rounded-cn-md font-cn-ui text-cn-text-primary',
            'placeholder:text-cn-text-placeholder',
            'transition-colors duration-[120ms]',
            'focus:outline-none focus:ring-2',
            sizeClasses[size],
            error
              ? 'border-cn-danger focus:border-cn-danger focus:ring-cn-danger/20'
              : 'border-cn-border-default focus:border-cn-border-focus focus:ring-cn-accent/20',
            disabled && 'opacity-30 bg-cn-bg-hover cursor-not-allowed',
            className
          )}
          {...props}
        />

        {error && errorMessage && (
          <p id={errorId} className="text-cn-xs text-cn-danger mt-cn-1">
            {errorMessage}
          </p>
        )}
      </div>
    )
  }
)

CnInput.displayName = 'CnInput'

export { CnInput }
