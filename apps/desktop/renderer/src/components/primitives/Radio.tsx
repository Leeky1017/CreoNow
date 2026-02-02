import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

export interface RadioOption {
  /** Unique value for the option */
  value: string;
  /** Display label */
  label: string;
  /** Optional description */
  description?: string;
  /** Whether the option is disabled */
  disabled?: boolean;
}

export interface RadioGroupProps {
  /** Array of radio options */
  options: RadioOption[];
  /** Current selected value */
  value?: string;
  /** Default selected value */
  defaultValue?: string;
  /** Callback when value changes */
  onValueChange?: (value: string) => void;
  /** Name attribute for form submission */
  name?: string;
  /** Whether the group is disabled */
  disabled?: boolean;
  /** Orientation of the radio group */
  orientation?: "horizontal" | "vertical";
  /** Additional className for root */
  className?: string;
  /** Size of the radio buttons */
  size?: "sm" | "md";
}

/**
 * Radio indicator icon
 */
function RadioIndicator({ size }: { size: "sm" | "md" }) {
  const indicatorSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";
  return (
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <span
        className={`${indicatorSize} rounded-[var(--radius-full)] bg-[var(--color-fg-default)]`}
      />
    </RadioGroupPrimitive.Indicator>
  );
}

/**
 * Size-specific styles
 */
const sizeStyles = {
  sm: {
    radio: "w-4 h-4",
    label: "text-xs",
    description: "text-[10px]",
    gap: "gap-2",
  },
  md: {
    radio: "w-5 h-5",
    label: "text-sm",
    description: "text-xs",
    gap: "gap-3",
  },
};

/**
 * RadioGroup component using Radix UI
 *
 * Displays a group of radio buttons for single selection.
 *
 * @example
 * ```tsx
 * <RadioGroup
 *   options={[
 *     { value: "light", label: "Light" },
 *     { value: "dark", label: "Dark" },
 *     { value: "system", label: "System" },
 *   ]}
 *   value={theme}
 *   onValueChange={setTheme}
 * />
 * ```
 */
export function RadioGroup({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  disabled,
  orientation = "vertical",
  className = "",
  size = "md",
}: RadioGroupProps): JSX.Element {
  const styles = sizeStyles[size];

  const rootClasses = [
    "flex",
    orientation === "horizontal" ? "flex-row gap-6" : "flex-col gap-3",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const radioStyles = [
    styles.radio,
    "rounded-[var(--radius-full)]",
    "border",
    "border-[var(--color-border-default)]",
    "bg-transparent",
    "flex",
    "items-center",
    "justify-center",
    "transition-colors",
    "duration-[var(--duration-fast)]",
    "hover:border-[var(--color-border-hover)]",
    "focus-visible:outline",
    "focus-visible:outline-[length:var(--ring-focus-width)]",
    "focus-visible:outline-offset-[var(--ring-focus-offset)]",
    "focus-visible:outline-[var(--color-ring-focus)]",
    "data-[state=checked]:border-[var(--color-fg-default)]",
    "disabled:opacity-50",
    "disabled:cursor-not-allowed",
  ].join(" ");

  return (
    <RadioGroupPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      name={name}
      disabled={disabled}
      orientation={orientation}
      className={rootClasses}
    >
      {options.map((option) => (
        <div key={option.value} className={`flex items-start ${styles.gap}`}>
          <RadioGroupPrimitive.Item
            value={option.value}
            disabled={option.disabled}
            id={`radio-${name || "group"}-${option.value}`}
            className={radioStyles}
          >
            <RadioIndicator size={size} />
          </RadioGroupPrimitive.Item>
          <div className="flex flex-col">
            <label
              htmlFor={`radio-${name || "group"}-${option.value}`}
              className={`${styles.label} text-[var(--color-fg-default)] cursor-pointer ${
                option.disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {option.label}
            </label>
            {option.description && (
              <span
                className={`${styles.description} text-[var(--color-fg-muted)] mt-0.5`}
              >
                {option.description}
              </span>
            )}
          </div>
        </div>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

/**
 * Single Radio component for custom layouts
 */
export interface RadioProps {
  /** Value of the radio */
  value: string;
  /** Whether the radio is disabled */
  disabled?: boolean;
  /** Additional className */
  className?: string;
  /** Size of the radio */
  size?: "sm" | "md";
}

export function Radio({
  value,
  disabled,
  className = "",
  size = "md",
}: RadioProps): JSX.Element {
  const styles = sizeStyles[size];

  const radioStyles = [
    styles.radio,
    "rounded-[var(--radius-full)]",
    "border",
    "border-[var(--color-border-default)]",
    "bg-transparent",
    "flex",
    "items-center",
    "justify-center",
    "transition-colors",
    "duration-[var(--duration-fast)]",
    "hover:border-[var(--color-border-hover)]",
    "focus-visible:outline",
    "focus-visible:outline-[length:var(--ring-focus-width)]",
    "focus-visible:outline-offset-[var(--ring-focus-offset)]",
    "focus-visible:outline-[var(--color-ring-focus)]",
    "data-[state=checked]:border-[var(--color-fg-default)]",
    "disabled:opacity-50",
    "disabled:cursor-not-allowed",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <RadioGroupPrimitive.Item
      value={value}
      disabled={disabled}
      className={radioStyles}
    >
      <RadioIndicator size={size} />
    </RadioGroupPrimitive.Item>
  );
}

/**
 * Re-export RadioGroup Root for custom layouts
 */
export const RadioGroupRoot = RadioGroupPrimitive.Root;
