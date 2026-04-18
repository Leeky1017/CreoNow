import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: "primary" | "secondary" | "ghost" | "danger";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    tone = "secondary",
    type = "button",
    ...props
  },
  ref,
) {
  return <button
    {...props}
    ref={ref}
    type={type}
    className={cn("cn-button", "cn-button--" + tone, className)}
  >
    {children}
  </button>;
});
