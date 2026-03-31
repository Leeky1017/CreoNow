'use client'

import { forwardRef } from 'react'
import { motion, type HTMLMotionProps, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface CnButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
}

const spinnerSizes = {
  sm: 'h-3 w-3 border-[1.5px]',
  md: 'h-4 w-4 border-2',
  lg: 'h-5 w-5 border-2',
} as const

const spinnerColors = {
  primary: 'border-cn-bg-surface/30 border-t-cn-bg-surface',
  ghost: 'border-cn-text-primary/30 border-t-cn-text-primary',
  danger: 'border-white/30 border-t-white',
} as const

const CnButton = forwardRef<HTMLButtonElement, CnButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isInert = disabled || loading

    const baseClasses =
      'inline-flex items-center justify-center font-medium font-cn-ui select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

    const variantClasses = {
      primary: 'bg-cn-accent text-cn-bg-surface focus-visible:ring-cn-accent',
      ghost:
        'bg-transparent text-cn-text-primary border border-cn-border-default focus-visible:ring-cn-accent',
      danger: 'bg-cn-danger text-white focus-visible:ring-cn-danger',
    }

    const sizeClasses = {
      sm: 'h-7 px-cn-3 text-cn-xs rounded-cn-md',
      md: 'h-9 px-cn-4 text-cn-sm rounded-cn-md',
      lg: 'h-11 px-cn-6 text-cn-base rounded-cn-md',
    }

    const inertClasses = disabled
      ? 'opacity-30 pointer-events-none cursor-not-allowed'
      : loading
        ? 'pointer-events-none cursor-default'
        : 'cursor-pointer'

    const hoverVariants = {
      primary: { opacity: 0.85 },
      ghost: { backgroundColor: 'var(--cn-bg-hover)' },
      danger: { filter: 'brightness(1.12)' },
    } as const

    const tapVariants = {
      primary: { scale: 0.97 },
      ghost: { scale: 0.97 },
      danger: { scale: 0.97, filter: 'brightness(0.92)' },
    } as const

    return (
      <motion.button
        ref={ref}
        whileHover={isInert ? undefined : hoverVariants[variant]}
        whileTap={isInert ? undefined : tapVariants[variant]}
        transition={{ duration: 0.12 }}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          inertClasses,
          className
        )}
        disabled={disabled}
        aria-disabled={isInert || undefined}
        aria-busy={loading || undefined}
        {...props}
      >
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.span
              key="spinner"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.12 }}
              className="inline-flex items-center justify-center"
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 0.7,
                  ease: 'linear',
                }}
                className={cn(
                  'rounded-cn-full border-solid',
                  spinnerSizes[size],
                  spinnerColors[variant]
                )}
              />
            </motion.span>
          ) : (
            <motion.span
              key="content"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.12 }}
              className="inline-flex items-center justify-center gap-cn-2"
            >
              {children}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    )
  }
)

CnButton.displayName = 'CnButton'

export { CnButton }
