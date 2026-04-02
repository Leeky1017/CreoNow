import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: "primary" | "secondary" | "ghost" | "danger";
}

export function Button({
  children,
  className,
  tone = "secondary",
  type = "button",
  ...props
}: ButtonProps) {
  return <button
    {...props}
    type={type}
    className={cn("cn-button", "cn-button--" + tone, className)}
  >
    {children}
  </button>;
}
