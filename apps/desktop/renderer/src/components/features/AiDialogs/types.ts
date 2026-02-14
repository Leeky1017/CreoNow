/**
 * AI Dialogs - Type definitions
 *
 * Type definitions for AI interaction dialogs including:
 * - Inline confirmation for AI suggestions
 * - Diff comparison modal
 * - Error state cards
 * - System confirmation dialogs
 */

/**
 * Error types for AI operations
 */
export type AiErrorType =
  | "connection_failed"
  | "timeout"
  | "rate_limit"
  | "usage_limit"
  | "service_error";

/**
 * Configuration for AI error states
 */
export interface AiErrorConfig {
  /** Error type */
  type: AiErrorType;
  /** Error title */
  title: string;
  /** Error description */
  description: string;
  /** Technical error code (optional) */
  errorCode?: string;
  /** Countdown seconds for rate limit (optional) */
  countdownSeconds?: number;
}

/**
 * State for inline confirm component
 */
export type InlineConfirmState =
  | "pending"
  | "applying"
  | "accepted"
  | "rejected";

/**
 * Props for AiInlineConfirm component
 */
export interface AiInlineConfirmProps {
  /** Original text (before AI modification) */
  originalText: string;
  /** Suggested text from AI */
  suggestedText: string;
  /** Callback when user accepts the suggestion */
  onAccept: () => void | Promise<void>;
  /** Callback when user rejects the suggestion */
  onReject: () => void | Promise<void>;
  /** Callback to view full diff */
  onViewDiff?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Show both original and suggested text in comparison mode */
  showComparison?: boolean;
}

/**
 * A single diff change item
 */
export interface DiffChange {
  /** Unique identifier */
  id: string;
  /** Original content */
  before: string;
  /** Modified content */
  after: string;
}

/**
 * Change state for individual diff items
 */
export type DiffChangeState = "pending" | "accepted" | "rejected";

/**
 * Props for AiDiffModal component
 */
export interface AiDiffModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal open state changes */
  onOpenChange: (open: boolean) => void;
  /** Array of changes to display */
  changes: DiffChange[];
  /** Current change index (0-based) */
  currentIndex?: number;
  /** Callback when current index changes */
  onCurrentIndexChange?: (index: number) => void;
  /** Callback when user accepts all changes */
  onAcceptAll: () => void;
  /** Callback when user rejects all changes */
  onRejectAll: () => void;
  /** Callback when user clicks apply changes */
  onApplyChanges: () => void;
  /** Callback when user clicks edit manually */
  onEditManually?: () => void;
  /** Simulated delay for async operations (ms) - for demo purposes */
  simulateDelay?: number;
  /** Initial change states for demo purposes */
  initialChangeStates?: Record<string, DiffChangeState>;
}

/**
 * Props for AiErrorCard component
 */
export interface AiErrorCardProps {
  /** Error configuration */
  error: AiErrorConfig;
  /** Optional test id for the rendered error code element */
  errorCodeTestId?: string;
  /** Callback when user clicks retry */
  onRetry?: () => void | Promise<void>;
  /** Callback when user clicks upgrade plan (for usage limit) */
  onUpgradePlan?: () => void;
  /** Callback when user clicks view usage (for usage limit) */
  onViewUsage?: () => void;
  /** Callback when user clicks check status (for service error) */
  onCheckStatus?: () => void;
  /** Callback when card is dismissed */
  onDismiss?: () => void;
  /** Whether to show dismiss button */
  showDismiss?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * System dialog types
 */
export type SystemDialogType = "delete" | "unsaved_changes" | "export_complete";

/**
 * Props for SystemDialog component
 */
export interface SystemDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Type of system dialog */
  type: SystemDialogType;
  /** Custom title (optional, uses default based on type) */
  title?: string;
  /** Custom description (optional, uses default based on type) */
  description?: string;
  /** Callback for primary action */
  onPrimaryAction: () => void;
  /** Callback for secondary action (e.g., Cancel) */
  onSecondaryAction?: () => void;
  /** Callback for tertiary action (e.g., Discard for unsaved changes) */
  onTertiaryAction?: () => void;
  /** Custom primary button label */
  primaryLabel?: string;
  /** Custom secondary button label */
  secondaryLabel?: string;
  /** Custom tertiary button label */
  tertiaryLabel?: string;
  /** Simulated delay for async operations (ms) - for demo purposes */
  simulateDelay?: number;
  /** Whether to show keyboard hints */
  showKeyboardHints?: boolean;
}
