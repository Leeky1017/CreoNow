import * as React from "react";
import { cn } from "../../lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 text-sm text-[var(--foreground)]",
          "placeholder:text-[var(--muted-foreground)]",
          "transition-[border-color] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
          "focus:border-[var(--accent-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-[var(--destructive)]",
          className,
        )}
        data-error={props["aria-invalid"] === "true" ? "" : undefined}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
