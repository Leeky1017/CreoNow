import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import "./EmptyState.css";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("cn-empty-state", className)}>
      {icon && <div className="cn-empty-state__icon">{icon}</div>}
      <h2 className="cn-empty-state__title">{title}</h2>
      {description && <p className="cn-empty-state__description">{description}</p>}
      {action && <div className="cn-empty-state__action">{action}</div>}
    </div>
  );
}
