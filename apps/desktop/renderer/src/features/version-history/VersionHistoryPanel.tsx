import { Button } from "../../components/primitives";

/**
 * Version author types
 */
export type VersionAuthorType = "user" | "ai" | "auto-save";

/**
 * Word change indicator
 */
export interface WordChange {
  type: "added" | "removed" | "none";
  count: number;
}

/**
 * Version entry data
 */
export interface VersionEntry {
  id: string;
  /** Display timestamp (e.g., "10:42 AM" or "Just now") */
  timestamp: string;
  /** Author type for badge styling */
  authorType: VersionAuthorType;
  /** Author display name */
  authorName: string;
  /** Description of the change */
  description: string;
  /** Word change indicator */
  wordChange: WordChange;
  /** Whether this is the current version */
  isCurrent?: boolean;
  /** Modification reason (e.g., "autosave", "manual-save", "ai-accept") */
  reason?: string;
  /** Number of affected paragraphs */
  affectedParagraphs?: number;
  /** Brief diff summary (first ~50 chars of change) */
  diffSummary?: string;
}

/**
 * Time group for organizing versions
 */
export interface TimeGroup {
  label: string;
  versions: VersionEntry[];
}

/**
 * VersionHistoryPanel props
 */
export interface VersionHistoryPanelProps {
  /** Document title */
  documentTitle?: string;
  /** Grouped versions by time */
  timeGroups: TimeGroup[];
  /** Currently selected version ID */
  selectedId?: string | null;
  /** Callback when a version is selected */
  onSelect?: (versionId: string) => void;
  /** Callback when restore is clicked */
  onRestore?: (versionId: string) => void;
  /** Callback when compare is clicked */
  onCompare?: (versionId: string) => void;
  /** Callback when preview is clicked */
  onPreview?: (versionId: string) => void;
  /** Callback when close is clicked */
  onClose?: () => void;
  /** Callback when configure auto-save is clicked */
  onConfigureAutoSave?: () => void;
  /** Last saved time text */
  lastSavedText?: string;
  /** Auto-save enabled */
  autoSaveEnabled?: boolean;
  /** Panel width in pixels */
  width?: number;
}

// ============================================================================
// Icons
// ============================================================================

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 256 256"
    >
      <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="10"
      fill="currentColor"
      viewBox="0 0 256 256"
    >
      <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z" />
    </svg>
  );
}

function AiIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="10"
      fill="currentColor"
      viewBox="0 0 256 256"
    >
      <path d="M216,40V216a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V40A16,16,0,0,1,56,24H200A16,16,0,0,1,216,40Zm-16,0H56V216H200V40ZM96,128a16,16,0,1,1,16,16A16,16,0,0,1,96,128Zm64,0a16,16,0,1,1,16,16A16,16,0,0,1,160,128Z" />
    </svg>
  );
}

function AutoSaveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="10"
      fill="currentColor"
      viewBox="0 0 256 256"
    >
      <path d="M222.14,61.76a8,8,0,0,0-5.9-7.86l-88-24a8,8,0,0,0-4.48,0l-88,24a8,8,0,0,0-5.9,7.86l24,168A8,8,0,0,0,61.7,236.9L128,218.82l66.3,18.08a8,8,0,0,0,7.84-7.14ZM128,202.18l-59,16.08L49.09,69.57,128,48.05l78.91,21.52L187,218.26Z" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 256 256"
    >
      <path d="M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39a3.07,3.07,0,0,1-.26.25L45.87,91H80a8,8,0,0,1,0,16H24a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V77.25l32.56-30a96,96,0,0,1,159.44,80.75Z" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 256 256"
    >
      <path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H208V208Z" />
      <path d="M112,80a8,8,0,0,0-8,8v96a8,8,0,0,0,16,0V88A8,8,0,0,0,112,80Z" />
      <path d="M160,80a8,8,0,0,0-8,8v96a8,8,0,0,0,16,0V88A8,8,0,0,0,160,80Z" />
    </svg>
  );
}

function PreviewIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 256 256"
    >
      <path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z" />
    </svg>
  );
}

// ============================================================================
// Styles
// ============================================================================

/**
 * Panel content styles - used by VersionHistoryPanelContent
 * Does NOT include container styles (aside/width/border/shadow).
 */
const panelContentStyles = [
  "bg-[var(--color-bg-surface)]",
  "flex",
  "flex-col",
  "h-full",
].join(" ");

/**
 * Legacy panel styles - includes container styles for standalone use.
 * @deprecated Use VersionHistoryPanelContent with layout containers instead.
 */
const panelStyles = [
  "bg-[var(--color-bg-surface)]",
  "border-l",
  "border-[var(--color-separator)]",
  "flex",
  "flex-col",
  "h-full",
  "shadow-2xl",
  "shrink-0",
].join(" ");

const headerStyles = [
  "px-5",
  "py-5",
  "border-b",
  "border-[var(--color-separator)]",
  "flex",
  "justify-between",
  "items-start",
  "bg-[var(--color-bg-surface)]",
].join(" ");

const closeButtonStyles = [
  "text-[var(--color-fg-muted)]",
  "hover:text-[var(--color-fg-default)]",
  "transition-colors",
  "p-1",
  "-mr-1",
  "rounded-md",
  "hover:bg-[rgba(255,255,255,0.05)]",
].join(" ");

const scrollAreaStyles = ["flex-1", "overflow-y-auto", "p-3", "space-y-2"].join(
  " ",
);

const footerStyles = [
  "px-5",
  "py-4",
  "border-t",
  "border-[var(--color-separator)]",
  "bg-[var(--color-bg-surface)]",
].join(" ");

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Author badge component
 */
function AuthorBadge({
  type,
  name,
}: {
  type: VersionAuthorType;
  name: string;
}) {
  const baseClasses = [
    "h-5",
    "px-1.5",
    "rounded",
    "flex",
    "items-center",
    "gap-1.5",
    "text-[10px]",
    "font-medium",
    "leading-none",
  ].join(" ");

  switch (type) {
    case "ai":
      return (
        <div
          className={`${baseClasses} bg-[var(--color-info-subtle)] border border-[var(--color-info)]/20 text-[var(--color-info)]`}
        >
          <AiIcon />
          <span className="mt-px">{name}</span>
        </div>
      );
    case "auto-save":
      return (
        <div
          className={`${baseClasses} bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.05)] text-[var(--color-fg-muted)]`}
        >
          <AutoSaveIcon />
          <span className="mt-px">{name}</span>
        </div>
      );
    default:
      return (
        <div
          className={`${baseClasses} bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.05)] text-[var(--color-fg-default)]`}
        >
          <UserIcon />
          <span className="mt-px">{name}</span>
        </div>
      );
  }
}

/**
 * Version metadata display (reason + affected paragraphs)
 */
function VersionMeta({
  reason,
  affectedParagraphs,
}: {
  reason?: string;
  affectedParagraphs?: number;
}) {
  if (!reason && affectedParagraphs === undefined) {
    return null;
  }

  // Map raw reason to human-readable text
  const getReasonText = (r: string): string => {
    if (r === "autosave") return "自动保存";
    if (r === "manual-save") return "手动保存";
    if (r === "status-change") return "状态变更";
    if (r === "ai-accept") return "AI 修改";
    if (r.startsWith("ai-apply:")) return "AI 修改";
    return r;
  };

  return (
    <div className="flex items-center gap-2 text-[10px] text-[var(--color-fg-placeholder)] mt-1">
      {reason && (
        <span className="flex items-center gap-1">
          <span className="opacity-60">原因:</span>
          <span>{getReasonText(reason)}</span>
        </span>
      )}
      {affectedParagraphs !== undefined && affectedParagraphs > 0 && (
        <>
          {reason && <span className="opacity-40">·</span>}
          <span>{affectedParagraphs} 段落受影响</span>
        </>
      )}
    </div>
  );
}

/**
 * Diff summary preview
 */
function DiffSummaryPreview({ summary }: { summary?: string }) {
  if (!summary) return null;

  return (
    <div className="mt-2 p-2 bg-[rgba(255,255,255,0.02)] rounded border border-[var(--color-separator)] text-[11px] text-[var(--color-fg-muted)] font-mono leading-relaxed">
      <span className="text-[var(--color-fg-placeholder)] text-[9px] uppercase tracking-wider block mb-1">
        变更预览
      </span>
      <span className="line-clamp-2">{summary}</span>
    </div>
  );
}

/**
 * Word change badge component
 */
function WordChangeBadge({ change }: { change: WordChange }) {
  if (change.type === "none") {
    return (
      <span className="text-[10px] text-[var(--color-fg-muted)] font-mono bg-[rgba(255,255,255,0.05)] px-1 rounded">
        No changes
      </span>
    );
  }

  const isAdded = change.type === "added";
  const colorClasses = isAdded
    ? "text-[var(--color-success)] bg-[var(--color-success-subtle)]"
    : "text-[var(--color-error)] bg-[var(--color-error-subtle)]";
  const sign = isAdded ? "+" : "-";

  return (
    <span className={`text-[10px] font-mono px-1 rounded ${colorClasses}`}>
      {sign}
      {change.count} words
    </span>
  );
}

/**
 * Hover actions overlay
 */
function HoverActions({
  versionId,
  onRestore,
  onCompare,
  onPreview,
}: {
  versionId: string;
  onRestore?: (id: string) => void;
  onCompare?: (id: string) => void;
  onPreview?: (id: string) => void;
}) {
  return (
    <div
      className={[
        "absolute",
        "inset-0",
        "bg-[var(--color-bg-hover)]/95",
        "backdrop-blur-sm",
        "rounded-lg",
        "flex",
        "items-center",
        "justify-center",
        "gap-2",
        "z-10",
        "opacity-0",
        "pointer-events-none",
        "group-hover:opacity-100",
        "group-hover:pointer-events-auto",
        "transition-opacity",
        "duration-[var(--duration-fast)]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => onRestore?.(versionId)}
        className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.1)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] transition-colors"
        title="Restore"
      >
        <RestoreIcon />
      </button>
      <button
        type="button"
        onClick={() => onCompare?.(versionId)}
        className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.1)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] transition-colors"
        title="Compare"
      >
        <CompareIcon />
      </button>
      <button
        type="button"
        onClick={() => onPreview?.(versionId)}
        className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.1)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] transition-colors"
        title="Preview"
      >
        <PreviewIcon />
      </button>
    </div>
  );
}

/**
 * Version card component
 */
function VersionCard({
  version,
  isSelected,
  onSelect,
  onRestore,
  onCompare,
  onPreview,
}: {
  version: VersionEntry;
  isSelected: boolean;
  onSelect?: (id: string) => void;
  onRestore?: (id: string) => void;
  onCompare?: (id: string) => void;
  onPreview?: (id: string) => void;
}) {
  const baseCardStyles = [
    "group",
    "relative",
    "p-3",
    "transition-colors",
    "duration-[var(--duration-fast)]",
  ].join(" ");

  if (isSelected) {
    return (
      <div
        className={`${baseCardStyles} rounded-r-lg rounded-l-none pl-[10px] bg-[#151515] border-l-2 border-[var(--color-accent)] border-t border-r border-b border-t-[var(--color-separator)] border-b-[var(--color-separator)] border-r-[var(--color-separator)]`}
        onClick={() => onSelect?.(version.id)}
        data-testid={`version-card-${version.id}`}
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs text-[var(--color-fg-muted)] font-medium">
            {version.timestamp}
          </span>
          <WordChangeBadge change={version.wordChange} />
        </div>

        <div className="flex items-center gap-2 mb-1">
          <AuthorBadge type={version.authorType} name={version.authorName} />
        </div>

        {/* Version metadata */}
        <VersionMeta
          reason={version.reason}
          affectedParagraphs={version.affectedParagraphs}
        />

        <p className="text-[13px] text-[var(--color-fg-default)] leading-snug mt-2 mb-2">
          {version.description}
        </p>

        {/* Diff summary preview */}
        <DiffSummaryPreview summary={version.diffSummary} />

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onRestore?.(version.id)}
            className="!h-7 !text-[10px] !px-0 !bg-[#222] hover:!bg-[#2a2a2a]"
          >
            Restore
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onCompare?.(version.id)}
            className="!h-7 !text-[10px] !px-0 !bg-[#222] hover:!bg-[#2a2a2a]"
          >
            Compare
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPreview?.(version.id)}
            className="!h-7 !text-[10px] !px-0 !bg-[#222] hover:!bg-[#2a2a2a]"
          >
            Preview
          </Button>
        </div>
      </div>
    );
  }

  if (version.isCurrent) {
    return (
      <div
        className={`${baseCardStyles} rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--color-separator)] hover:bg-[var(--color-bg-hover)] cursor-pointer`}
        onClick={() => onSelect?.(version.id)}
        data-testid={`version-card-${version.id}`}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-1.5 py-0.5 rounded">
              Current
            </span>
            <span className="text-xs text-[var(--color-fg-placeholder)]">
              {version.timestamp}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <AuthorBadge type={version.authorType} name={version.authorName} />
        </div>

        <p className="text-[13px] text-[var(--color-fg-muted)] leading-snug mb-2 font-light">
          {version.description}
        </p>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--color-fg-placeholder)] font-medium">
            {version.wordChange.count === 0
              ? "0 words changed"
              : `${version.wordChange.type === "added" ? "+" : "-"}${version.wordChange.count} words changed`}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${baseCardStyles} rounded-lg border border-transparent hover:border-[var(--color-separator)] hover:bg-[var(--color-bg-hover)] cursor-pointer`}
      onClick={() => onSelect?.(version.id)}
      data-testid={`version-card-${version.id}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-[var(--color-fg-placeholder)] group-hover:text-[var(--color-fg-muted)]">
          {version.timestamp}
        </span>
        <WordChangeBadge change={version.wordChange} />
      </div>

      <div className="flex items-center gap-2 mb-1">
        <AuthorBadge type={version.authorType} name={version.authorName} />
      </div>

      {/* Version metadata - shows affected paragraphs if available */}
      {version.affectedParagraphs !== undefined &&
        version.affectedParagraphs > 0 && (
          <div className="text-[10px] text-[var(--color-fg-placeholder)] mt-1 mb-1">
            {version.affectedParagraphs} 段落受影响
          </div>
        )}

      <p className="text-[13px] text-[var(--color-fg-placeholder)] group-hover:text-[var(--color-fg-muted)] leading-snug mb-1">
        {version.description}
      </p>

      {/* Hover actions */}
      <HoverActions
        versionId={version.id}
        onRestore={onRestore}
        onCompare={onCompare}
        onPreview={onPreview}
      />
    </div>
  );
}

/**
 * Time group section
 */
function TimeGroupSection({
  group,
  selectedId,
  onSelect,
  onRestore,
  onCompare,
  onPreview,
}: {
  group: TimeGroup;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onRestore?: (id: string) => void;
  onCompare?: (id: string) => void;
  onPreview?: (id: string) => void;
}) {
  // Don't render label if it's empty (for "Just now" group)
  const showLabel = group.label !== "";

  return (
    <>
      {showLabel && (
        <div className="px-2 py-1">
          <span className="text-[10px] font-medium text-[var(--color-fg-placeholder)] uppercase tracking-wider">
            {group.label}
          </span>
        </div>
      )}
      {group.versions.map((version) => (
        <VersionCard
          key={version.id}
          version={version}
          isSelected={selectedId === version.id}
          onSelect={onSelect}
          onRestore={onRestore}
          onCompare={onCompare}
          onPreview={onPreview}
        />
      ))}
    </>
  );
}

// ============================================================================
// Main Components
// ============================================================================

/**
 * Props for VersionHistoryPanelContent (without container-specific props)
 */
export interface VersionHistoryPanelContentProps {
  /** Document title */
  documentTitle?: string;
  /** Grouped versions by time */
  timeGroups: TimeGroup[];
  /** Currently selected version ID */
  selectedId?: string | null;
  /** Callback when a version is selected */
  onSelect?: (versionId: string) => void;
  /** Callback when restore is clicked */
  onRestore?: (versionId: string) => void;
  /** Callback when compare is clicked */
  onCompare?: (versionId: string) => void;
  /** Callback when preview is clicked */
  onPreview?: (versionId: string) => void;
  /** Callback when close is clicked */
  onClose?: () => void;
  /** Callback when configure auto-save is clicked */
  onConfigureAutoSave?: () => void;
  /** Last saved time text */
  lastSavedText?: string;
  /** Auto-save enabled */
  autoSaveEnabled?: boolean;
  /** Whether to show the close button */
  showCloseButton?: boolean;
}

/**
 * VersionHistoryPanelContent - Content component without container styles.
 *
 * Use this component inside layout containers (Sidebar/RightPanel) that
 * handle their own container styling (width/border/shadow).
 *
 * Features:
 * - Grouped version list by time (Just now, Earlier Today, Yesterday)
 * - Version cards with author type badges (User/AI/Auto-Save)
 * - Word change indicators (+124 words / -12 words / No changes)
 * - Selected version with action buttons (Restore/Compare/Preview)
 * - Hover actions for quick access
 * - Auto-save status footer
 *
 * Design ref: 23-version-history.html
 *
 * @example
 * ```tsx
 * // Inside a layout container
 * <VersionHistoryPanelContent
 *   documentTitle="Project Requirements.docx"
 *   timeGroups={timeGroups}
 *   selectedId={selectedVersionId}
 *   onSelect={setSelectedVersionId}
 *   onRestore={handleRestore}
 *   showCloseButton={false}
 * />
 * ```
 */
export function VersionHistoryPanelContent({
  documentTitle = "Untitled Document",
  timeGroups,
  selectedId,
  onSelect,
  onRestore,
  onCompare,
  onPreview,
  onClose,
  onConfigureAutoSave,
  lastSavedText = "2m ago",
  autoSaveEnabled = true,
  showCloseButton = true,
}: VersionHistoryPanelContentProps): JSX.Element {
  return (
    <div
      className={panelContentStyles}
      data-testid="version-history-panel-content"
    >
      {/* Header */}
      <div className={headerStyles}>
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--color-fg-default)] tracking-tight">
            Version History
          </h2>
          <p className="text-xs text-[var(--color-fg-muted)] mt-1 font-medium truncate max-w-[200px]">
            {documentTitle}
          </p>
        </div>
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className={closeButtonStyles}
            aria-label="Close version history"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className={scrollAreaStyles}>
        {timeGroups.map((group, index) => (
          <TimeGroupSection
            key={group.label || `group-${index}`}
            group={group}
            selectedId={selectedId}
            onSelect={onSelect}
            onRestore={onRestore}
            onCompare={onCompare}
            onPreview={onPreview}
          />
        ))}
        <div className="h-2" />
      </div>

      {/* Footer */}
      <div className={footerStyles}>
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${autoSaveEnabled ? "bg-[var(--color-success)]" : "bg-[var(--color-fg-placeholder)]"}`}
          />
          <span className="text-xs text-[var(--color-fg-muted)]">
            {autoSaveEnabled
              ? `Auto-save on (last saved ${lastSavedText})`
              : "Auto-save off"}
          </span>
        </div>
        <button
          type="button"
          onClick={onConfigureAutoSave}
          className="text-[11px] text-[var(--color-accent-muted)] hover:text-[var(--color-accent)] transition-colors hover:underline"
        >
          Configure auto-save settings
        </button>
      </div>
    </div>
  );
}

/**
 * VersionHistoryPanel - Right-side panel for viewing and managing document version history
 *
 * This is the standalone panel component with its own container styles.
 * For use inside layout containers, prefer VersionHistoryPanelContent instead.
 *
 * Features:
 * - Grouped version list by time (Just now, Earlier Today, Yesterday)
 * - Version cards with author type badges (User/AI/Auto-Save)
 * - Word change indicators (+124 words / -12 words / No changes)
 * - Selected version with action buttons (Restore/Compare/Preview)
 * - Hover actions for quick access
 * - Auto-save status footer
 *
 * Design ref: 23-version-history.html
 *
 * @example
 * ```tsx
 * <VersionHistoryPanel
 *   documentTitle="Project Requirements.docx"
 *   timeGroups={timeGroups}
 *   selectedId={selectedVersionId}
 *   onSelect={setSelectedVersionId}
 *   onRestore={handleRestore}
 *   onCompare={handleCompare}
 *   onPreview={handlePreview}
 * />
 * ```
 */
export function VersionHistoryPanel({
  documentTitle = "Untitled Document",
  timeGroups,
  selectedId,
  onSelect,
  onRestore,
  onCompare,
  onPreview,
  onClose,
  onConfigureAutoSave,
  lastSavedText = "2m ago",
  autoSaveEnabled = true,
  width = 320,
}: VersionHistoryPanelProps): JSX.Element {
  return (
    <aside
      className={panelStyles}
      style={{ width }}
      data-testid="version-history-panel"
    >
      <VersionHistoryPanelContent
        documentTitle={documentTitle}
        timeGroups={timeGroups}
        selectedId={selectedId}
        onSelect={onSelect}
        onRestore={onRestore}
        onCompare={onCompare}
        onPreview={onPreview}
        onClose={onClose}
        onConfigureAutoSave={onConfigureAutoSave}
        lastSavedText={lastSavedText}
        autoSaveEnabled={autoSaveEnabled}
        showCloseButton={true}
      />
    </aside>
  );
}
