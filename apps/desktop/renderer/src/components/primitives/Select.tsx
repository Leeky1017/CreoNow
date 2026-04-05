import type { SelectHTMLAttributes } from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";

import "./Select.css";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className={cn("cn-select", className)}>
      <select {...props} className="cn-select__native">
        {children}
      </select>
      <span className="cn-select__chevron">
        <ChevronDown size={12} strokeWidth={2} />
      </span>
    </div>
  );
}
