import * as React from "react";
import { cn } from "../../lib/utils";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  selected?: boolean;
  loading?: boolean;
}

const Spinner = () => (
  <svg
    className="animate-spin h-[18px] w-[18px]"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      icon,
      label,
      selected = false,
      loading = false,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={selected}
        disabled={disabled}
        data-loading={loading ? "" : undefined}
        className={cn(
          "inline-flex items-center justify-center h-9 w-9 rounded-lg",
          "transition-[background] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          selected
            ? "text-[var(--accent)] bg-[var(--accent-subtle)]"
            : "text-[var(--muted-foreground)] bg-transparent hover:text-[var(--icon-hover-fg)] hover:bg-[var(--overlay-hover)]",
          "active:text-[var(--icon-active-fg)] active:bg-[var(--overlay-active-strong)] active:duration-[var(--duration-instant)]",
          "disabled:text-[var(--icon-disabled-fg)] disabled:cursor-not-allowed disabled:hover:bg-transparent",
          className,
        )}
        {...props}
      >
        {loading ? <Spinner /> : icon}
      </button>
    );
  },
);
IconButton.displayName = "IconButton";

export { IconButton };
