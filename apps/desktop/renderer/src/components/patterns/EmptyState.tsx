import React from "react";
import { Button, Text, Heading } from "../primitives";

/**
 * Empty state variants based on design spec §12.1
 *
 * Each variant represents a different empty scenario with appropriate
 * illustration, message, and action.
 */
export type EmptyStateVariant =
  | "project"
  | "files"
  | "search"
  | "characters"
  | "generic";

export interface EmptyStateProps {
  /** Predefined variant for common scenarios */
  variant?: EmptyStateVariant;
  /** Custom illustration (SVG or image element) */
  illustration?: React.ReactNode;
  /** Main title text */
  title?: string;
  /** Description text (optional) */
  description?: string;
  /** Primary action button label */
  actionLabel?: string;
  /** Primary action callback */
  onAction?: () => void;
  /** Secondary action button label */
  secondaryActionLabel?: string;
  /** Secondary action callback */
  onSecondaryAction?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Default content for each variant (design spec §12.1)
 */
const variantDefaults: Record<
  EmptyStateVariant,
  { title: string; description: string; actionLabel: string }
> = {
  project: {
    title: "开始创建你的第一个文件",
    description: "创建一个新文件开始你的创作之旅",
    actionLabel: "新建文件",
  },
  files: {
    title: "暂无文件",
    description: "此文件夹中没有任何文件",
    actionLabel: "新建文件",
  },
  search: {
    title: "未找到匹配结果",
    description: "尝试使用不同的关键词进行搜索",
    actionLabel: "清除搜索",
  },
  characters: {
    title: "暂无角色",
    description: "创建角色来丰富你的故事",
    actionLabel: "创建角色",
  },
  generic: {
    title: "暂无内容",
    description: "这里还没有任何内容",
    actionLabel: "开始",
  },
};

/**
 * Default illustration SVG component
 *
 * A simple, neutral illustration that works for various empty states.
 * Uses CSS variables for theming support.
 */
function DefaultIllustration({
  variant,
}: {
  variant: EmptyStateVariant;
}): JSX.Element {
  // Use different icons based on variant
  const getIcon = () => {
    switch (variant) {
      case "project":
      case "files":
        return (
          // File/folder icon
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        );
      case "search":
        return (
          // Search icon
          <>
            <circle cx="11" cy="11" r="8" strokeWidth={1.5} fill="none" />
            <path
              strokeLinecap="round"
              strokeWidth={1.5}
              d="M21 21l-4.35-4.35"
            />
          </>
        );
      case "characters":
        return (
          // Person icon
          <>
            <circle cx="12" cy="8" r="4" strokeWidth={1.5} fill="none" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
            />
          </>
        );
      default:
        return (
          // Generic empty box icon
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        );
    }
  };

  return (
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-bg-hover)]">
      <svg
        className="h-8 w-8 text-[var(--color-fg-muted)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {getIcon()}
      </svg>
    </div>
  );
}

/**
 * EmptyState component following design spec §12.1
 *
 * Displays a placeholder when content is empty. Supports predefined variants
 * for common scenarios (empty project, empty files, no search results, etc.)
 * or fully customizable content.
 *
 * @example
 * ```tsx
 * // Using a predefined variant
 * <EmptyState variant="files" onAction={() => createNewFile()} />
 *
 * // Using custom content
 * <EmptyState
 *   title="No items"
 *   description="Add items to get started"
 *   actionLabel="Add Item"
 *   onAction={handleAdd}
 * />
 * ```
 */
export function EmptyState({
  variant = "generic",
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
}: EmptyStateProps): JSX.Element {
  const defaults = variantDefaults[variant];

  // Use provided values or fall back to variant defaults
  const displayTitle = title ?? defaults.title;
  const displayDescription = description ?? defaults.description;
  const displayActionLabel = actionLabel ?? defaults.actionLabel;

  return (
    <div
      className={[
        "flex flex-col items-center justify-center",
        "py-12 px-6",
        "text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Illustration */}
      {illustration ?? <DefaultIllustration variant={variant} />}

      {/* Title */}
      <Heading level="h3" className="mb-2">
        {displayTitle}
      </Heading>

      {/* Description */}
      {displayDescription && (
        <Text size="body" color="muted" as="p" className="mb-6 max-w-[280px]">
          {displayDescription}
        </Text>
      )}

      {/* Actions */}
      {(onAction || onSecondaryAction) && (
        <div className="flex items-center gap-3">
          {onAction && (
            <Button variant="primary" size="md" onClick={onAction}>
              {displayActionLabel}
            </Button>
          )}
          {onSecondaryAction && secondaryActionLabel && (
            <Button variant="ghost" size="md" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
