import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import "./SectionHeader.css";

interface SectionHeaderProps {
  label: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ label, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("cn-section-header", className)}>
      <h3 className="cn-section-header__label">{label}</h3>
      {action && <div className="cn-section-header__action">{action}</div>}
    </div>
  );
}
