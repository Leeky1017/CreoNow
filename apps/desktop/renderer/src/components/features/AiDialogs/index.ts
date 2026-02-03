/**
 * AI Dialogs - Components for AI interaction and system feedback
 *
 * This module exports components for:
 * - Inline AI suggestion confirmation (Accept/Reject)
 * - Side-by-side diff comparison modal
 * - Error state cards for AI operations
 * - System confirmation dialogs
 *
 * @example
 * ```tsx
 * import {
 *   AiInlineConfirm,
 *   AiDiffModal,
 *   AiErrorCard,
 *   SystemDialog,
 * } from '@/components/features/AiDialogs';
 *
 * // Inline confirmation
 * <AiInlineConfirm
 *   originalText="old text"
 *   suggestedText="new text"
 *   onAccept={handleAccept}
 *   onReject={handleReject}
 * />
 *
 * // Error card
 * <AiErrorCard
 *   error={{ type: "connection_failed", title: "Connection Failed", description: "..." }}
 *   onRetry={handleRetry}
 * />
 *
 * // System dialog
 * <SystemDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   type="delete"
 *   onPrimaryAction={handleDelete}
 * />
 * ```
 */

export { AiInlineConfirm } from "./AiInlineConfirm";
export { AiDiffModal, DiffText } from "./AiDiffModal";
export { AiErrorCard } from "./AiErrorCard";
export { SystemDialog } from "./SystemDialog";

export type {
  AiErrorType,
  AiErrorConfig,
  InlineConfirmState,
  AiInlineConfirmProps,
  DiffChange,
  DiffChangeState,
  AiDiffModalProps,
  AiErrorCardProps,
  SystemDialogType,
  SystemDialogProps,
} from "./types";
