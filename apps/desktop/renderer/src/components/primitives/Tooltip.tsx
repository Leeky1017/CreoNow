import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TooltipProps {
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  children: ReactNode;
}

export const TooltipProvider = TooltipPrimitive.Provider;

export const Tooltip = forwardRef<HTMLButtonElement, TooltipProps>(
  ({ content, side = 'top', className, children }, ref) => (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger ref={ref} asChild>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-50 overflow-hidden rounded-md bg-modal px-3 py-1.5 text-xs text-foreground',
            'shadow-md border border-border',
            'animate-in fade-in-0 zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            className,
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  ),
);

Tooltip.displayName = 'Tooltip';
