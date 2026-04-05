import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import "./StatPill.css";

interface StatPillProps {
  icon?: ReactNode;
  label: string;
  className?: string;
}

export function StatPill({ icon, label, className }: StatPillProps) {
  return (
    <span className={cn("cn-stat-pill", className)}>
      {icon && <span className="cn-stat-pill__icon">{icon}</span>}
      {label}
    </span>
  );
}
