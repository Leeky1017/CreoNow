import React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

/**
 * Popover component props
 *
 * A floating popover component built on Radix UI Popover primitive.
 * Implements z-index popover (300) and shadow-md (§3.7, §5.2).
 */
export interface PopoverProps {
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Default open state (uncontrolled) */
  defaultOpen?: boolean;
  /** Trigger element */
  trigger: React.ReactNode;
  /** Popover content */
  children: React.ReactNode;
  /** Preferred side of the trigger to render. Default: "bottom" */
  side?: "top" | "right" | "bottom" | "left";
  /** Offset from trigger in pixels. Default: 8 */
  sideOffset?: number;
  /** Alignment relative to trigger. Default: "center" */
  align?: "start" | "center" | "end";
}

/**
 * Content styles - popover with shadow-md (§3.7, §5.2)
 *
 * Uses CSS transitions for animation (no tailwindcss-animate dependency).
 */
const contentStyles = [
  "z-[var(--z-popover)]",
  // Visual
  "bg-[var(--color-bg-raised)]",
  "border",
  "border-[var(--color-border-default)]",
  "rounded-[var(--radius-md)]",
  "shadow-[var(--shadow-md)]",
  // Sizing
  "min-w-[200px]",
  "max-w-[320px]",
  "p-4",
  // Animation via CSS transition
  "transition-[opacity,transform]",
  "duration-[var(--duration-fast)]",
  "ease-[var(--ease-default)]",
  "data-[state=open]:opacity-100",
  "data-[state=open]:scale-100",
  "data-[state=closed]:opacity-0",
  "data-[state=closed]:scale-95",
  // Focus
  "focus:outline-none",
].join(" ");

/**
 * Popover component following design spec §5.2
 *
 * A floating popover built on Radix UI Popover for proper positioning and focus management.
 * Uses z-index popover (300) and shadow-md.
 *
 * @example
 * ```tsx
 * <Popover trigger={<Button variant="ghost">Open Menu</Button>}>
 *   <div>Popover content here</div>
 * </Popover>
 * ```
 */
export function Popover({
  open,
  onOpenChange,
  defaultOpen,
  trigger,
  children,
  side = "bottom",
  sideOffset = 8,
  align = "center",
}: PopoverProps): JSX.Element {
  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      defaultOpen={defaultOpen}
    >
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={contentStyles}
          side={side}
          sideOffset={sideOffset}
          align={align}
          collisionPadding={8}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/**
 * PopoverClose - Wraps an element that closes the popover
 */
export const PopoverClose = PopoverPrimitive.Close;

/**
 * PopoverAnchor - Anchors the popover to a different element than the trigger
 */
export const PopoverAnchor = PopoverPrimitive.Anchor;
