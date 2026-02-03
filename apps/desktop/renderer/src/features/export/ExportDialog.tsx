import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Button, Checkbox, Select } from "../../components/primitives";

/**
 * Export format types
 */
export type ExportFormat = "pdf" | "markdown" | "word" | "txt";

/**
 * Page size options (PDF only)
 */
export type PageSize = "a4" | "letter" | "legal";

/**
 * Export view states
 */
export type ExportView = "config" | "progress" | "success";

/**
 * Export options configuration
 */
export interface ExportOptions {
  format: ExportFormat;
  pageSize: PageSize;
  includeMetadata: boolean;
  versionHistory: boolean;
  embedImages: boolean;
}

/**
 * Progress step definition
 */
export interface ProgressStep {
  label: string;
  threshold: number;
}

/**
 * ExportDialog props
 */
export interface ExportDialogProps {
  /** Controlled open state */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Document title to export */
  documentTitle?: string;
  /** Estimated file size */
  estimatedSize?: string;
  /** Initial export options */
  initialOptions?: Partial<ExportOptions>;
  /** Callback when export is triggered */
  onExport?: (options: ExportOptions) => void;
  /** Callback when export is cancelled */
  onCancel?: () => void;
  /** Current view state (for controlled mode/stories) */
  view?: ExportView;
  /** Current progress (0-100) for progress view */
  progress?: number;
  /** Current step label for progress view */
  progressStep?: string;
}

/**
 * Default export options
 */
export const defaultExportOptions: ExportOptions = {
  format: "pdf",
  pageSize: "a4",
  includeMetadata: true,
  versionHistory: false,
  embedImages: true,
};

/**
 * Progress steps configuration
 */
const progressSteps: ProgressStep[] = [
  { label: "Preparing...", threshold: 30 },
  { label: "Generating pages...", threshold: 60 },
  { label: "Embedding images...", threshold: 90 },
  { label: "Finalizing PDF...", threshold: 100 },
];

/**
 * Get current step label based on progress
 */
function getProgressStepLabel(progress: number): string {
  for (const step of progressSteps) {
    if (progress < step.threshold) {
      return step.label;
    }
  }
  return progressSteps[progressSteps.length - 1].label;
}

/**
 * Format option configuration
 */
interface FormatOption {
  value: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}

/**
 * Format options
 */
const formatOptions: FormatOption[] = [
  {
    value: "pdf",
    label: "PDF",
    description: "Portable Document",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M10 13H8v5h2" />
        <path d="M15 15h-2v3h2" />
        <path d="M16 13h-3v5" />
      </svg>
    ),
  },
  {
    value: "markdown",
    label: "Markdown",
    description: ".md",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M12 18v-6" />
        <path d="M9 15l3 3 3-3" />
      </svg>
    ),
  },
  {
    value: "word",
    label: "Word",
    description: ".docx",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M8 13h8" />
        <path d="M8 17h8" />
        <path d="M8 9h5" />
      </svg>
    ),
  },
  {
    value: "txt",
    label: "Plain Text",
    description: ".txt",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
];

/**
 * Page size options for Select
 */
const pageSizeOptions = [
  { value: "a4", label: "A4" },
  { value: "letter", label: "Letter" },
  { value: "legal", label: "Legal" },
];

// ============================================================================
// Styles
// ============================================================================

const overlayStyles = [
  "fixed",
  "inset-0",
  "z-[var(--z-modal)]",
  "bg-[rgba(0,0,0,0.6)]",
  "backdrop-blur-sm",
  "transition-opacity",
  "duration-[var(--duration-normal)]",
  "ease-[var(--ease-default)]",
  "data-[state=open]:opacity-100",
  "data-[state=closed]:opacity-0",
].join(" ");

const contentStyles = [
  "fixed",
  "left-1/2",
  "top-1/2",
  "-translate-x-1/2",
  "-translate-y-1/2",
  "z-[var(--z-modal)]",
  "w-[480px]",
  "bg-[var(--color-bg-surface)]",
  "border",
  "border-[var(--color-border-default)]",
  "rounded-[var(--radius-lg)]",
  "shadow-2xl",
  "flex",
  "flex-col",
  "max-h-[90vh]",
  "overflow-hidden",
  // Animation
  "transition-[opacity,transform]",
  "duration-[var(--duration-normal)]",
  "ease-[var(--ease-default)]",
  "data-[state=open]:opacity-100",
  "data-[state=open]:scale-100",
  "data-[state=closed]:opacity-0",
  "data-[state=closed]:scale-95",
  "focus:outline-none",
].join(" ");

const closeButtonStyles = [
  "p-1",
  "rounded-[var(--radius-sm)]",
  "text-[var(--color-fg-muted)]",
  "hover:text-[var(--color-fg-default)]",
  "hover:bg-[var(--color-bg-hover)]",
  "transition-colors",
  "duration-[var(--duration-fast)]",
].join(" ");

const labelStyles = [
  "text-[10px]",
  "font-semibold",
  "text-[var(--color-fg-placeholder)]",
  "uppercase",
  "tracking-[0.1em]",
  "mb-3",
  "block",
].join(" ");

const formatCardStyles = (isSelected: boolean) =>
  [
    "p-3",
    "rounded-[var(--radius-md)]",
    "border",
    "cursor-pointer",
    "transition-all",
    "duration-[var(--duration-fast)]",
    "h-full",
    isSelected
      ? [
          "border-[var(--color-accent)]",
          "bg-[var(--color-accent-subtle)]",
        ].join(" ")
      : [
          "border-[var(--color-border-default)]",
          "bg-[rgba(8,8,8,0.5)]",
          "hover:bg-[var(--color-bg-hover)]",
        ].join(" "),
  ].join(" ");

const radioIndicatorStyles = (isSelected: boolean) =>
  [
    "w-4",
    "h-4",
    "rounded-[var(--radius-full)]",
    "border",
    "flex",
    "items-center",
    "justify-center",
    isSelected
      ? "border-[var(--color-accent)] opacity-100"
      : "border-[var(--color-border-default)] opacity-0",
  ].join(" ");

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Format card radio button
 */
function FormatCard({
  option,
  isSelected,
}: {
  option: FormatOption;
  isSelected: boolean;
}) {
  return (
    <RadioGroupPrimitive.Item
      value={option.value}
      className={formatCardStyles(isSelected)}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className={
            isSelected
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-fg-muted)]"
          }
        >
          {option.icon}
        </div>
        <div className={radioIndicatorStyles(isSelected)}>
          {isSelected && (
            <span className="w-2 h-2 rounded-[var(--radius-full)] bg-[var(--color-accent)]" />
          )}
        </div>
      </div>
      <div className="font-medium text-sm text-[var(--color-fg-default)]">
        {option.label}
      </div>
      <div
        className={`text-xs mt-0.5 ${
          option.value === "markdown" || option.value === "txt"
            ? "font-mono"
            : ""
        } text-[var(--color-fg-muted)]`}
      >
        {option.description}
      </div>
    </RadioGroupPrimitive.Item>
  );
}

/**
 * Preview thumbnail
 */
function PreviewThumbnail({
  format,
  pageSize,
}: {
  format: ExportFormat;
  pageSize: PageSize;
}) {
  const formatLabel = format.toUpperCase();
  const pageSizeLabel = pageSize.toUpperCase();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={labelStyles}>Preview</span>
        <span className="text-[10px] text-[var(--color-fg-placeholder)] bg-[var(--color-bg-hover)] px-1.5 py-0.5 rounded">
          {formatLabel} • {pageSizeLabel}
        </span>
      </div>
      <div className="w-full h-32 bg-[#050505] border border-[var(--color-border-default)] rounded-[var(--radius-md)] p-4 overflow-hidden relative">
        <div className="opacity-50 select-none pointer-events-none transform scale-[0.8] origin-top-left w-[120%]">
          <div className="h-4 w-3/4 bg-[var(--color-fg-placeholder)]/40 rounded mb-3" />
          <div className="h-2 w-full bg-[var(--color-fg-placeholder)]/20 rounded mb-1.5" />
          <div className="h-2 w-full bg-[var(--color-fg-placeholder)]/20 rounded mb-1.5" />
          <div className="h-2 w-5/6 bg-[var(--color-fg-placeholder)]/20 rounded mb-3" />
          <div className="h-2 w-full bg-[var(--color-fg-placeholder)]/20 rounded mb-1.5" />
          <div className="h-2 w-4/5 bg-[var(--color-fg-placeholder)]/20 rounded mb-1.5" />
          <div className="w-full h-16 bg-[var(--color-fg-placeholder)]/10 rounded mt-4 border border-white/5" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#050505] to-transparent" />
      </div>
    </div>
  );
}

/**
 * Config view - format selection and options
 */
function ConfigView({
  options,
  onOptionsChange,
  onExport,
  onCancel,
  estimatedSize,
}: {
  options: ExportOptions;
  onOptionsChange: (options: ExportOptions) => void;
  onExport: () => void;
  onCancel: () => void;
  estimatedSize: string;
}) {
  const isPdfFormat = options.format === "pdf";

  return (
    <>
      <div className="overflow-y-auto p-6 space-y-6">
        {/* Format Selection */}
        <div>
          <span className={labelStyles}>Format</span>
          <RadioGroupPrimitive.Root
            value={options.format}
            onValueChange={(value) =>
              onOptionsChange({ ...options, format: value as ExportFormat })
            }
            className="grid grid-cols-2 gap-3"
          >
            {formatOptions.map((option) => (
              <FormatCard
                key={option.value}
                option={option}
                isSelected={options.format === option.value}
              />
            ))}
          </RadioGroupPrimitive.Root>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Settings Column */}
          <div className="space-y-3">
            <span className={labelStyles}>Settings</span>

            <Checkbox
              checked={options.includeMetadata}
              onCheckedChange={(checked) =>
                onOptionsChange({
                  ...options,
                  includeMetadata: checked === true,
                })
              }
              label="Include metadata"
            />

            <Checkbox
              checked={options.versionHistory}
              onCheckedChange={(checked) =>
                onOptionsChange({
                  ...options,
                  versionHistory: checked === true,
                })
              }
              label="Version history"
            />

            <Checkbox
              checked={options.embedImages}
              onCheckedChange={(checked) =>
                onOptionsChange({
                  ...options,
                  embedImages: checked === true,
                })
              }
              label="Embed images"
            />
          </div>

          {/* Page Size Column */}
          <div className="space-y-3">
            <span className={labelStyles}>Page Size</span>
            <Select
              value={options.pageSize}
              onValueChange={(value) =>
                onOptionsChange({ ...options, pageSize: value as PageSize })
              }
              options={pageSizeOptions}
              disabled={!isPdfFormat}
              fullWidth
            />
          </div>
        </div>

        {/* Preview */}
        <PreviewThumbnail format={options.format} pageSize={options.pageSize} />
      </div>

      {/* Footer */}
      <div className="p-6 pt-4 border-t border-[var(--color-separator)] flex items-center justify-between bg-[var(--color-bg-surface)]">
        <span className="text-sm text-[var(--color-fg-muted)]">
          {estimatedSize}
        </span>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onExport}
            className="!bg-[var(--color-accent)] !text-[var(--color-fg-inverse)] hover:!bg-[var(--color-accent-hover)] shadow-lg shadow-[var(--color-accent)]/20"
          >
            Export
          </Button>
        </div>
      </div>
    </>
  );
}

/**
 * Progress view - export in progress
 */
function ProgressView({
  documentTitle,
  format,
  progress,
  progressStep,
  onCancel,
}: {
  documentTitle: string;
  format: ExportFormat;
  progress: number;
  progressStep: string;
  onCancel: () => void;
}) {
  const formatLabel = format.toUpperCase();

  return (
    <div className="flex flex-col h-[400px] items-center justify-center p-8 text-center">
      {/* Icon with pulse animation */}
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent)] mb-6 relative">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>

      <h3 className="text-xl font-medium text-[var(--color-fg-default)] mb-2">
        Exporting Document
      </h3>
      <p className="text-[var(--color-fg-muted)] text-sm mb-8">
        Converting &ldquo;{documentTitle}&rdquo; to {formatLabel}...
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-2">
        <div className="h-1.5 w-full bg-[var(--color-bg-hover)] rounded-[var(--radius-full)] overflow-hidden">
          <div
            className="h-full bg-[var(--color-accent)] rounded-[var(--radius-full)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between w-full max-w-xs text-xs text-[var(--color-fg-placeholder)] font-mono">
        <span>{progressStep}</span>
        <span>{Math.floor(progress)}%</span>
      </div>

      <Button variant="ghost" onClick={onCancel} className="mt-8">
        Cancel
      </Button>
    </div>
  );
}

/**
 * Success view - export complete
 */
function SuccessView({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex flex-col h-[400px] items-center justify-center p-8 text-center">
      {/* Success icon */}
      <div className="w-16 h-16 rounded-[var(--radius-full)] bg-[var(--color-success-subtle)] flex items-center justify-center text-[var(--color-success)] mb-6 border border-[var(--color-success)]/20">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h3 className="text-xl font-medium text-[var(--color-fg-default)] mb-2">
        Export Complete
      </h3>
      <p className="text-[var(--color-fg-muted)] text-sm mb-8">
        Your file has been successfully downloaded.
      </p>

      <Button
        variant="primary"
        onClick={onDone}
        className="!bg-white !text-black hover:!bg-gray-200"
      >
        Done
      </Button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ExportDialog component
 *
 * A dialog for exporting documents with format selection, options configuration,
 * progress tracking, and success feedback.
 *
 * Features:
 * - 4 format options: PDF, Markdown, Word, Plain Text
 * - Export settings: metadata, version history, embed images
 * - Page size selection (PDF only)
 * - Live preview thumbnail
 * - Progress bar with step labels
 * - Success confirmation
 *
 * @example
 * ```tsx
 * <ExportDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   documentTitle="The Architecture of Silence"
 *   onExport={(options) => handleExport(options)}
 * />
 * ```
 */
export function ExportDialog({
  open,
  onOpenChange,
  documentTitle = "Untitled Document",
  estimatedSize = "~2.4 MB",
  initialOptions,
  onExport,
  onCancel,
  view: controlledView,
  progress: controlledProgress,
  progressStep: controlledProgressStep,
}: ExportDialogProps): JSX.Element {
  // Internal state for uncontrolled mode
  const [internalView, setInternalView] = React.useState<ExportView>("config");
  const [internalProgress, setInternalProgress] = React.useState(0);
  const [options, setOptions] = React.useState<ExportOptions>({
    ...defaultExportOptions,
    ...initialOptions,
  });

  // Use controlled or internal values
  const view = controlledView ?? internalView;
  const progress = controlledProgress ?? internalProgress;
  const progressStep =
    controlledProgressStep ?? getProgressStepLabel(progress);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setInternalView("config");
      setInternalProgress(0);
      setOptions({
        ...defaultExportOptions,
        ...initialOptions,
      });
    }
  }, [open, initialOptions]);

  const handleExport = () => {
    setInternalView("progress");

    // Simulate export progress
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 5;
      if (currentProgress > 100) currentProgress = 100;
      setInternalProgress(currentProgress);

      if (currentProgress === 100) {
        clearInterval(interval);
        setTimeout(() => {
          setInternalView("success");
          onExport?.(options);
        }, 600);
      }
    }, 100);
  };

  const handleCancel = () => {
    if (view === "progress") {
      setInternalView("config");
      setInternalProgress(0);
    } else {
      onCancel?.();
      onOpenChange(false);
    }
  };

  const handleDone = () => {
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlayStyles} />
        <DialogPrimitive.Content className={contentStyles}>
          {view === "config" && (
            <>
              {/* Header */}
              <div className="flex items-start justify-between p-6 pb-4 border-b border-[var(--color-separator)]">
                <div>
                  <DialogPrimitive.Title className="text-lg font-medium text-[var(--color-fg-default)] mb-1">
                    Export Document
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="text-sm text-[var(--color-fg-muted)]">
                    {documentTitle}
                  </DialogPrimitive.Description>
                </div>
                <DialogPrimitive.Close className={closeButtonStyles} aria-label="Close">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </DialogPrimitive.Close>
              </div>

              <ConfigView
                options={options}
                onOptionsChange={setOptions}
                onExport={handleExport}
                onCancel={handleCancel}
                estimatedSize={estimatedSize}
              />
            </>
          )}

          {view === "progress" && (
            <>
              <DialogPrimitive.Title className="sr-only">
                Exporting Document
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                Export in progress. Please wait.
              </DialogPrimitive.Description>
              <ProgressView
                documentTitle={documentTitle}
                format={options.format}
                progress={progress}
                progressStep={progressStep}
                onCancel={handleCancel}
              />
            </>
          )}

          {view === "success" && (
            <>
              <DialogPrimitive.Title className="sr-only">
                Export Complete
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                Your file has been successfully downloaded.
              </DialogPrimitive.Description>
              <SuccessView onDone={handleDone} />
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
