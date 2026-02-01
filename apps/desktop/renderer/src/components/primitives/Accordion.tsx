import React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";

export interface AccordionItem {
  /** Unique value for the item */
  value: string;
  /** Header/trigger text */
  title: string;
  /** Content to display when expanded */
  content: React.ReactNode;
  /** Whether the item is disabled */
  disabled?: boolean;
}

export interface AccordionProps {
  /** Array of accordion items */
  items: AccordionItem[];
  /** Type: single (one open at a time) or multiple */
  type?: "single" | "multiple";
  /** Default expanded items */
  defaultValue?: string | string[];
  /** Controlled value */
  value?: string | string[];
  /** Callback when value changes */
  onValueChange?: (value: string | string[]) => void;
  /** Whether items can be collapsed (only for single type) */
  collapsible?: boolean;
  /** Additional className for root */
  className?: string;
}

/**
 * Styles for accordion root
 */
const rootStyles = [
  "w-full",
  "rounded-[var(--radius-lg)]",
  "border",
  "border-[var(--color-border-default)]",
  "overflow-hidden",
].join(" ");

/**
 * Styles for accordion item
 */
const itemStyles = [
  "border-b",
  "border-[var(--color-separator)]",
  "last:border-b-0",
].join(" ");

/**
 * Styles for accordion trigger
 */
const triggerStyles = [
  "flex",
  "w-full",
  "items-center",
  "justify-between",
  "px-4",
  "py-3",
  "text-sm",
  "font-medium",
  "text-[var(--color-fg-default)]",
  "bg-transparent",
  "border-0",
  "cursor-pointer",
  "transition-colors",
  "duration-[var(--duration-fast)]",
  "hover:bg-[var(--color-bg-hover)]",
  "focus-visible:outline",
  "focus-visible:outline-[length:var(--ring-focus-width)]",
  "focus-visible:outline-offset-[-2px]",
  "focus-visible:outline-[var(--color-ring-focus)]",
  "disabled:opacity-50",
  "disabled:cursor-not-allowed",
  "[&[data-state=open]>svg]:rotate-180",
].join(" ");

/**
 * Styles for accordion content
 */
const contentStyles = [
  "overflow-hidden",
  "text-sm",
  "text-[var(--color-fg-muted)]",
  "data-[state=open]:animate-accordion-down",
  "data-[state=closed]:animate-accordion-up",
].join(" ");

/**
 * Styles for content inner wrapper
 */
const contentInnerStyles = "px-4 pb-4 pt-0";

/**
 * Chevron icon component
 */
function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-[var(--duration-fast)] ${className ?? ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/**
 * Accordion component using Radix UI
 *
 * Displays collapsible content sections.
 *
 * @example
 * ```tsx
 * <Accordion
 *   items={[
 *     { value: "item-1", title: "Section 1", content: "Content 1" },
 *     { value: "item-2", title: "Section 2", content: "Content 2" },
 *   ]}
 * />
 * ```
 */
export function Accordion({
  items,
  type = "single",
  defaultValue,
  value,
  onValueChange,
  collapsible = true,
  className = "",
}: AccordionProps): JSX.Element {
  const rootClasses = [rootStyles, className].filter(Boolean).join(" ");

  // Type-safe props based on accordion type
  if (type === "single") {
    return (
      <AccordionPrimitive.Root
        type="single"
        defaultValue={defaultValue as string | undefined}
        value={value as string | undefined}
        onValueChange={onValueChange as ((value: string) => void) | undefined}
        collapsible={collapsible}
        className={rootClasses}
      >
        {items.map((item) => (
          <AccordionPrimitive.Item
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={itemStyles}
          >
            <AccordionPrimitive.Header>
              <AccordionPrimitive.Trigger className={triggerStyles}>
                {item.title}
                <ChevronIcon />
              </AccordionPrimitive.Trigger>
            </AccordionPrimitive.Header>
            <AccordionPrimitive.Content className={contentStyles}>
              <div className={contentInnerStyles}>{item.content}</div>
            </AccordionPrimitive.Content>
          </AccordionPrimitive.Item>
        ))}
      </AccordionPrimitive.Root>
    );
  }

  return (
    <AccordionPrimitive.Root
      type="multiple"
      defaultValue={defaultValue as string[] | undefined}
      value={value as string[] | undefined}
      onValueChange={onValueChange as ((value: string[]) => void) | undefined}
      className={rootClasses}
    >
      {items.map((item) => (
        <AccordionPrimitive.Item
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          className={itemStyles}
        >
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className={triggerStyles}>
              {item.title}
              <ChevronIcon />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className={contentStyles}>
            <div className={contentInnerStyles}>{item.content}</div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
