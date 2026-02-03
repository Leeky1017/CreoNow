/**
 * Export feature module
 *
 * Provides document export functionality with support for multiple formats:
 * - PDF (with page size options)
 * - Markdown
 * - Word (.docx)
 * - Plain Text (.txt)
 *
 * @example
 * ```tsx
 * import { ExportDialog } from '@/features/export';
 *
 * <ExportDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   documentTitle="My Document"
 *   onExport={(options) => handleExport(options)}
 * />
 * ```
 */

export { ExportDialog, defaultExportOptions } from "./ExportDialog";
export type {
  ExportDialogProps,
  ExportFormat,
  ExportOptions,
  ExportView,
  PageSize,
  ProgressStep,
} from "./ExportDialog";
