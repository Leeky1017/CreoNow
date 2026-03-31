'use client'

import * as React from 'react'
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  CnTooltipProvider                                                  */
/* ------------------------------------------------------------------ */

export type CnTooltipProviderProps = TooltipPrimitive.Provider.Props

function CnTooltipProvider({ delay = 300, ...props }: CnTooltipProviderProps) {
  return <TooltipPrimitive.Provider data-slot="cn-tooltip-provider" delay={delay} {...props} />
}

/* ------------------------------------------------------------------ */
/*  CnTooltip — Root                                                   */
/* ------------------------------------------------------------------ */

export type CnTooltipProps = TooltipPrimitive.Root.Props

function CnTooltip({ ...props }: CnTooltipProps) {
  return <TooltipPrimitive.Root data-slot="cn-tooltip" {...props} />
}

/* ------------------------------------------------------------------ */
/*  CnTooltipTrigger                                                   */
/* ------------------------------------------------------------------ */

export type CnTooltipTriggerProps = TooltipPrimitive.Trigger.Props

function CnTooltipTrigger({ ...props }: CnTooltipTriggerProps) {
  return <TooltipPrimitive.Trigger data-slot="cn-tooltip-trigger" {...props} />
}

/* ------------------------------------------------------------------ */
/*  CnTooltipContent                                                   */
/* ------------------------------------------------------------------ */

export interface CnTooltipContentProps extends TooltipPrimitive.Popup.Props {
  side?: 'top' | 'bottom' | 'left' | 'right'
  sideOffset?: number
}

function CnTooltipContent({
  className,
  side = 'top',
  sideOffset = 4,
  children,
  ...props
}: CnTooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
        <TooltipPrimitive.Popup
          data-slot="cn-tooltip-content"
          className={cn(
            'bg-cn-tooltip-bg text-cn-tooltip-text text-cn-xs',
            'px-[10px] py-[6px]',
            'rounded-[6px]',
            'max-w-[240px]',
            'shadow-cn-float',
            'z-[var(--cn-z-tooltip)]',
            'duration-[120ms]',
            'data-open:animate-in data-open:fade-in-0',
            'data-closed:animate-out data-closed:fade-out-0',
            'data-[side=top]:slide-in-from-bottom-1',
            'data-[side=bottom]:slide-in-from-top-1',
            'data-[side=left]:slide-in-from-right-1',
            'data-[side=right]:slide-in-from-left-1',
            className
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { CnTooltipProvider, CnTooltip, CnTooltipTrigger, CnTooltipContent }
