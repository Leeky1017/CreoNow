import { Button } from "../../components/primitives";

// ============================================================================
// Types
// ============================================================================

/**
 * Check status
 */
export type CheckStatus = "passed" | "warning" | "error" | "running";

/**
 * Issue severity
 */
export type IssueSeverity = "warning" | "error";

/**
 * Individual issue within a check
 */
export interface CheckIssue {
  id: string;
  /** Issue description */
  description: string;
  /** Location in document (e.g., "Chapter 3, Paragraph 5") */
  location?: string;
  /** Severity level */
  severity: IssueSeverity;
  /** Whether this issue has been ignored */
  ignored?: boolean;
}

/**
 * Individual quality check item
 */
export interface CheckItem {
  id: string;
  /** Check name (e.g., "Passive Voice", "Character Names") */
  name: string;
  /** Description of what this check does */
  description: string;
  /** Current status */
  status: CheckStatus;
  /** Result value (e.g., "8%", "76%") */
  resultValue?: string;
  /** Issues found by this check */
  issues?: CheckIssue[];
  /** Number of ignored issues */
  ignoredCount?: number;
  /** Whether this check is enabled */
  enabled?: boolean;
}

/**
 * Group of related checks
 */
export interface CheckGroup {
  id: string;
  /** Group name (e.g., "Style", "Consistency") */
  name: string;
  /** Checks in this group */
  checks: CheckItem[];
}

/**
 * Overall panel status
 */
export type PanelStatus = "all-passed" | "issues-found" | "errors" | "running";

/**
 * Check frequency options
 */
export type CheckFrequency = "on-demand" | "after-edit" | "every-5-minutes";

/**
 * Settings for quality checks
 */
export interface QualitySettings {
  /** Run checks on save */
  runOnSave: boolean;
  /** Block save on errors */
  blockOnErrors: boolean;
  /** Check frequency */
  frequency: CheckFrequency;
}

/**
 * QualityGatesPanel props
 */
export interface QualityGatesPanelProps {
  /** Groups of quality checks */
  checkGroups: CheckGroup[];
  /** Overall panel status */
  panelStatus: PanelStatus;
  /** Total issues count */
  issuesCount?: number;
  /** Currently expanded check ID */
  expandedCheckId?: string | null;
  /** Callback when check is expanded/collapsed */
  onToggleCheck?: (checkId: string) => void;
  /** Callback when Fix Issue is clicked */
  onFixIssue?: (checkId: string, issueId: string) => void;
  /** Callback when Ignore is clicked */
  onIgnoreIssue?: (checkId: string, issueId: string) => void;
  /** Callback when View in Editor is clicked */
  onViewInEditor?: (checkId: string, issueId: string) => void;
  /** Callback when Run All Checks is clicked */
  onRunAllChecks?: () => void;
  /** Callback when close is clicked */
  onClose?: () => void;
  /** Settings configuration */
  settings?: QualitySettings;
  /** Callback when settings change */
  onSettingsChange?: (settings: QualitySettings) => void;
  /** Whether settings section is expanded */
  settingsExpanded?: boolean;
  /** Callback when settings section is toggled */
  onToggleSettings?: () => void;
  /** Panel width in pixels */
  width?: number;
  /** Fix in progress for issue */
  fixingIssueId?: string | null;
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

function CheckCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 256 256"
    >
      <path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 256 256"
    >
      <path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 256 256"
    >
      <path d="M165.66,101.66,139.31,128l26.35,26.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 256 256"
      className={`transition-transform duration-[var(--duration-fast)] ${expanded ? "rotate-180" : ""}`}
    >
      <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 256 256"
    >
      <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06ZM128,168a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      fill="currentColor"
      viewBox="0 0 256 256"
    >
      <path d="M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      fill="currentColor"
      viewBox="0 0 256 256"
    >
      <path d="M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z" />
    </svg>
  );
}

// ============================================================================
// Styles
// ============================================================================

/**
 * Panel content styles - used by QualityGatesPanelContent
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
 * @deprecated Use QualityGatesPanelContent with layout containers instead.
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

const scrollAreaStyles = [
  "flex-1",
  "overflow-y-auto",
  "p-3",
  "space-y-3",
].join(" ");

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Status indicator at the top of the panel
 */
function PanelStatusIndicator({
  status,
  issuesCount,
}: {
  status: PanelStatus;
  issuesCount?: number;
}) {
  const statusConfig = {
    "all-passed": {
      color: "bg-[var(--color-success)]",
      text: "All Passed",
      textColor: "text-[var(--color-success)]",
    },
    "issues-found": {
      color: "bg-[var(--color-warning)]",
      text: `${issuesCount ?? 0} Issue${issuesCount !== 1 ? "s" : ""} Found`,
      textColor: "text-[var(--color-warning)]",
    },
    errors: {
      color: "bg-[var(--color-error)]",
      text: `${issuesCount ?? 0} Error${issuesCount !== 1 ? "s" : ""}`,
      textColor: "text-[var(--color-error)]",
    },
    running: {
      color: "bg-[var(--color-info)]",
      text: "Running checks...",
      textColor: "text-[var(--color-info)]",
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      {status === "running" ? (
        <SpinnerIcon />
      ) : (
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
      )}
      <span className={`text-xs font-medium ${config.textColor}`}>
        {config.text}
      </span>
    </div>
  );
}

/**
 * Check status icon
 */
function CheckStatusIcon({ status }: { status: CheckStatus }) {
  switch (status) {
    case "passed":
      return (
        <span className="text-[var(--color-success)]">
          <CheckCircleIcon />
        </span>
      );
    case "warning":
      return (
        <span className="text-[var(--color-warning)]">
          <WarningIcon />
        </span>
      );
    case "error":
      return (
        <span className="text-[var(--color-error)]">
          <ErrorIcon />
        </span>
      );
    case "running":
      return (
        <span className="text-[var(--color-info)]">
          <SpinnerIcon />
        </span>
      );
    default:
      return null;
  }
}

/**
 * Toggle switch component for settings
 */
function SettingsToggle({
  id,
  label,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <label
        htmlFor={id}
        className={`text-[13px] text-[var(--color-fg-default)] select-none cursor-pointer ${disabled ? "opacity-50" : ""}`}
      >
        {label}
      </label>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex items-center w-11 h-6 rounded-full border shrink-0 cursor-pointer transition-all duration-[var(--duration-slow)] ease-[var(--ease-default)] focus-visible:outline focus-visible:outline-[length:var(--ring-focus-width)] focus-visible:outline-offset-[var(--ring-focus-offset)] focus-visible:outline-[var(--color-ring-focus)] ${
          checked
            ? "bg-[var(--color-fg-default)] border-[var(--color-fg-default)]"
            : "bg-[var(--color-bg-hover)] border-[var(--color-border-default)]"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`absolute left-[3px] w-[18px] h-[18px] rounded-full transition-all duration-[var(--duration-slow)] pointer-events-none ${
            checked
              ? "translate-x-[20px] bg-[var(--color-fg-inverse)]"
              : "translate-x-0 bg-[var(--color-fg-subtle)]"
          }`}
        />
      </button>
    </div>
  );
}

/**
 * Issue detail card
 */
function IssueCard({
  issue,
  checkId,
  onFix,
  onIgnore,
  onViewInEditor,
  isFixing,
}: {
  issue: CheckIssue;
  checkId: string;
  onFix?: (checkId: string, issueId: string) => void;
  onIgnore?: (checkId: string, issueId: string) => void;
  onViewInEditor?: (checkId: string, issueId: string) => void;
  isFixing?: boolean;
}) {
  if (issue.ignored) {
    return (
      <div className="p-3 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[var(--color-separator)] opacity-50">
        <p className="text-[12px] text-[var(--color-fg-muted)] line-through">
          {issue.description}
        </p>
        <span className="text-[10px] text-[var(--color-fg-placeholder)] mt-1 inline-block">
          Ignored
        </span>
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-lg border ${
        issue.severity === "error"
          ? "bg-[var(--color-error-subtle)] border-[var(--color-error)]/20"
          : "bg-[var(--color-warning-subtle)] border-[var(--color-warning)]/20"
      }`}
      data-testid={`issue-card-${issue.id}`}
    >
      <p className="text-[12px] text-[var(--color-fg-default)] leading-relaxed">
        {issue.description}
      </p>
      {issue.location && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-[var(--color-fg-muted)]">
          <LocationIcon />
          <button
            type="button"
            onClick={() => onViewInEditor?.(checkId, issue.id)}
            className="hover:text-[var(--color-fg-default)] hover:underline transition-colors"
          >
            {issue.location}
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 mt-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onFix?.(checkId, issue.id)}
          loading={isFixing}
          className="!h-6 !text-[10px] !px-2"
        >
          Fix Issue
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onIgnore?.(checkId, issue.id)}
          className="!h-6 !text-[10px] !px-2"
        >
          Ignore
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewInEditor?.(checkId, issue.id)}
          className="!h-6 !text-[10px] !px-2"
        >
          View in Editor
        </Button>
      </div>
    </div>
  );
}

/**
 * Individual check item
 */
function CheckItemRow({
  check,
  isExpanded,
  onToggle,
  onFix,
  onIgnore,
  onViewInEditor,
  fixingIssueId,
}: {
  check: CheckItem;
  isExpanded: boolean;
  onToggle?: (checkId: string) => void;
  onFix?: (checkId: string, issueId: string) => void;
  onIgnore?: (checkId: string, issueId: string) => void;
  onViewInEditor?: (checkId: string, issueId: string) => void;
  fixingIssueId?: string | null;
}) {
  const hasIssues = check.issues && check.issues.length > 0;
  const activeIssues = check.issues?.filter((i) => !i.ignored) ?? [];
  const issueCount = activeIssues.length;

  return (
    <div
      className="border-b border-[var(--color-separator)] last:border-b-0"
      data-testid={`check-item-${check.id}`}
    >
      <button
        type="button"
        onClick={() => hasIssues && onToggle?.(check.id)}
        disabled={!hasIssues}
        className={`w-full px-3 py-3 flex items-start gap-3 text-left transition-colors duration-[var(--duration-fast)] ${
          hasIssues
            ? "hover:bg-[var(--color-bg-hover)] cursor-pointer"
            : "cursor-default"
        }`}
      >
        <div className="mt-0.5">
          <CheckStatusIcon status={check.status} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-[var(--color-fg-default)]">
              {check.name}
            </span>
            {issueCount > 0 && (
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  check.status === "error"
                    ? "bg-[var(--color-error-subtle)] text-[var(--color-error)]"
                    : "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]"
                }`}
              >
                {issueCount}
              </span>
            )}
            {check.ignoredCount && check.ignoredCount > 0 && (
              <span className="text-[10px] text-[var(--color-fg-placeholder)]">
                {check.ignoredCount} Ignored
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5 leading-relaxed">
            {check.description}
          </p>
          {check.resultValue && check.status === "passed" && (
            <span className="text-[11px] text-[var(--color-success)] mt-1 inline-block">
              {check.resultValue}
            </span>
          )}
        </div>
        {hasIssues && (
          <div className="mt-1">
            <ChevronIcon expanded={isExpanded} />
          </div>
        )}
      </button>

      {/* Expanded issue details */}
      {isExpanded && hasIssues && (
        <div className="px-3 pb-3 space-y-2">
          {check.issues?.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              checkId={check.id}
              onFix={onFix}
              onIgnore={onIgnore}
              onViewInEditor={onViewInEditor}
              isFixing={fixingIssueId === issue.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Check group accordion
 */
function CheckGroupAccordion({
  group,
  expandedCheckId,
  onToggleCheck,
  onFix,
  onIgnore,
  onViewInEditor,
  fixingIssueId,
}: {
  group: CheckGroup;
  expandedCheckId?: string | null;
  onToggleCheck?: (checkId: string) => void;
  onFix?: (checkId: string, issueId: string) => void;
  onIgnore?: (checkId: string, issueId: string) => void;
  onViewInEditor?: (checkId: string, issueId: string) => void;
  fixingIssueId?: string | null;
}) {
  const checkCount = group.checks.length;
  const passedCount = group.checks.filter((c) => c.status === "passed").length;

  return (
    <div
      className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] overflow-hidden"
      data-testid={`check-group-${group.id}`}
    >
      <div className="px-4 py-3 bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-separator)]">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-[var(--color-fg-default)]">
            {group.name}
          </span>
          <span className="text-[11px] text-[var(--color-fg-muted)]">
            {passedCount}/{checkCount} checks
          </span>
        </div>
      </div>
      <div>
        {group.checks.map((check) => (
          <CheckItemRow
            key={check.id}
            check={check}
            isExpanded={expandedCheckId === check.id}
            onToggle={onToggleCheck}
            onFix={onFix}
            onIgnore={onIgnore}
            onViewInEditor={onViewInEditor}
            fixingIssueId={fixingIssueId}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Settings section
 */
function SettingsSection({
  settings,
  onSettingsChange,
  expanded,
  onToggle,
}: {
  settings: QualitySettings;
  onSettingsChange?: (settings: QualitySettings) => void;
  expanded: boolean;
  onToggle?: () => void;
}) {
  const frequencyOptions: { value: CheckFrequency; label: string }[] = [
    { value: "on-demand", label: "On demand" },
    { value: "after-edit", label: "After every edit" },
    { value: "every-5-minutes", label: "Every 5 minutes" },
  ];

  return (
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[var(--color-bg-hover)] transition-colors duration-[var(--duration-fast)]"
      >
        <div className="flex items-center gap-2">
          <SettingsIcon />
          <span className="text-[13px] font-medium text-[var(--color-fg-default)]">
            Settings
          </span>
        </div>
        <ChevronIcon expanded={expanded} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--color-separator)]">
          <div className="pt-4 space-y-4">
            <SettingsToggle
              id="run-on-save"
              label="Run checks on save"
              checked={settings.runOnSave}
              onChange={(checked) =>
                onSettingsChange?.({ ...settings, runOnSave: checked })
              }
            />
            <SettingsToggle
              id="block-on-errors"
              label="Block save on errors"
              checked={settings.blockOnErrors}
              onChange={(checked) =>
                onSettingsChange?.({ ...settings, blockOnErrors: checked })
              }
            />
            <div className="flex items-center justify-between">
              <label
                htmlFor="check-frequency"
                className="text-[13px] text-[var(--color-fg-default)]"
              >
                Check frequency
              </label>
              <select
                id="check-frequency"
                value={settings.frequency}
                onChange={(e) =>
                  onSettingsChange?.({
                    ...settings,
                    frequency: e.target.value as CheckFrequency,
                  })
                }
                className="text-[12px] bg-[var(--color-bg-hover)] border border-[var(--color-border-default)] rounded-[var(--radius-sm)] px-2 py-1 text-[var(--color-fg-default)] focus:outline-none focus:border-[var(--color-border-focus)]"
              >
                {frequencyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Components
// ============================================================================

/**
 * Props for QualityGatesPanelContent (without container-specific props)
 */
export interface QualityGatesPanelContentProps {
  /** Groups of quality checks */
  checkGroups: CheckGroup[];
  /** Overall panel status */
  panelStatus: PanelStatus;
  /** Total issues count */
  issuesCount?: number;
  /** Currently expanded check ID */
  expandedCheckId?: string | null;
  /** Callback when check is expanded/collapsed */
  onToggleCheck?: (checkId: string) => void;
  /** Callback when Fix Issue is clicked */
  onFixIssue?: (checkId: string, issueId: string) => void;
  /** Callback when Ignore is clicked */
  onIgnoreIssue?: (checkId: string, issueId: string) => void;
  /** Callback when View in Editor is clicked */
  onViewInEditor?: (checkId: string, issueId: string) => void;
  /** Callback when Run All Checks is clicked */
  onRunAllChecks?: () => void;
  /** Callback when close is clicked */
  onClose?: () => void;
  /** Settings configuration */
  settings?: QualitySettings;
  /** Callback when settings change */
  onSettingsChange?: (settings: QualitySettings) => void;
  /** Whether settings section is expanded */
  settingsExpanded?: boolean;
  /** Callback when settings section is toggled */
  onToggleSettings?: () => void;
  /** Fix in progress for issue */
  fixingIssueId?: string | null;
  /** Whether to show the close button */
  showCloseButton?: boolean;
}

/**
 * QualityGatesPanelContent - Content component without container styles.
 *
 * Use this component inside layout containers (Sidebar/RightPanel) that
 * handle their own container styling (width/border/shadow).
 *
 * Features:
 * - Grouped quality checks (Style, Consistency, Completeness)
 * - Check items with status indicators (passed/warning/error/running)
 * - Expandable issue details with Fix/Ignore/View actions
 * - Settings toggles for check configuration
 * - Run All Checks button
 *
 * Design ref: 35-constraints-panel.html
 *
 * @example
 * ```tsx
 * // Inside a layout container
 * <QualityGatesPanelContent
 *   checkGroups={checkGroups}
 *   panelStatus="issues-found"
 *   issuesCount={2}
 *   expandedCheckId={expandedId}
 *   onToggleCheck={setExpandedId}
 *   showCloseButton={false}
 * />
 * ```
 */
export function QualityGatesPanelContent({
  checkGroups,
  panelStatus,
  issuesCount,
  expandedCheckId,
  onToggleCheck,
  onFixIssue,
  onIgnoreIssue,
  onViewInEditor,
  onRunAllChecks,
  onClose,
  settings = {
    runOnSave: true,
    blockOnErrors: false,
    frequency: "on-demand",
  },
  onSettingsChange,
  settingsExpanded = false,
  onToggleSettings,
  fixingIssueId,
  showCloseButton = true,
}: QualityGatesPanelContentProps): JSX.Element {
  return (
    <div
      className={panelContentStyles}
      data-testid="quality-gates-panel-content"
    >
      {/* Header */}
      <div className={headerStyles}>
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--color-fg-default)] tracking-tight">
            Quality Gates
          </h2>
          <div className="mt-2">
            <PanelStatusIndicator status={panelStatus} issuesCount={issuesCount} />
          </div>
        </div>
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className={closeButtonStyles}
            aria-label="Close quality gates panel"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className={scrollAreaStyles}>
        {/* Run All Checks button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onRunAllChecks}
          loading={panelStatus === "running"}
          fullWidth
          className="!justify-center !gap-2"
        >
          <PlayIcon />
          Run All Checks
        </Button>

        {/* Success message when all passed */}
        {panelStatus === "all-passed" && (
          <div className="p-4 bg-[var(--color-success-subtle)] border border-[var(--color-success)]/20 rounded-[var(--radius-lg)] text-center">
            <CheckCircleIcon />
            <p className="text-[13px] text-[var(--color-success)] mt-2">
              Your content meets all quality standards.
            </p>
          </div>
        )}

        {/* Check groups */}
        {checkGroups.map((group) => (
          <CheckGroupAccordion
            key={group.id}
            group={group}
            expandedCheckId={expandedCheckId}
            onToggleCheck={onToggleCheck}
            onFix={onFixIssue}
            onIgnore={onIgnoreIssue}
            onViewInEditor={onViewInEditor}
            fixingIssueId={fixingIssueId}
          />
        ))}

        {/* Settings */}
        <SettingsSection
          settings={settings}
          onSettingsChange={onSettingsChange}
          expanded={settingsExpanded}
          onToggle={onToggleSettings}
        />
      </div>
    </div>
  );
}

/**
 * QualityGatesPanel - Right-side panel for quality checks and constraints
 *
 * This is the standalone panel component with its own container styles.
 * For use inside layout containers, prefer QualityGatesPanelContent instead.
 *
 * Features:
 * - Grouped quality checks (Style, Consistency, Completeness)
 * - Check items with status indicators (passed/warning/error/running)
 * - Expandable issue details with Fix/Ignore/View actions
 * - Settings toggles for check configuration
 * - Run All Checks button
 *
 * Design ref: 35-constraints-panel.html
 *
 * @example
 * ```tsx
 * <QualityGatesPanel
 *   checkGroups={checkGroups}
 *   panelStatus="issues-found"
 *   issuesCount={2}
 *   expandedCheckId={expandedId}
 *   onToggleCheck={setExpandedId}
 *   onFixIssue={handleFix}
 *   onIgnoreIssue={handleIgnore}
 *   onRunAllChecks={handleRunAll}
 * />
 * ```
 */
export function QualityGatesPanel({
  checkGroups,
  panelStatus,
  issuesCount,
  expandedCheckId,
  onToggleCheck,
  onFixIssue,
  onIgnoreIssue,
  onViewInEditor,
  onRunAllChecks,
  onClose,
  settings = {
    runOnSave: true,
    blockOnErrors: false,
    frequency: "on-demand",
  },
  onSettingsChange,
  settingsExpanded = false,
  onToggleSettings,
  width = 320,
  fixingIssueId,
}: QualityGatesPanelProps): JSX.Element {
  return (
    <aside
      className={panelStyles}
      style={{ width }}
      data-testid="quality-gates-panel"
    >
      <QualityGatesPanelContent
        checkGroups={checkGroups}
        panelStatus={panelStatus}
        issuesCount={issuesCount}
        expandedCheckId={expandedCheckId}
        onToggleCheck={onToggleCheck}
        onFixIssue={onFixIssue}
        onIgnoreIssue={onIgnoreIssue}
        onViewInEditor={onViewInEditor}
        onRunAllChecks={onRunAllChecks}
        onClose={onClose}
        settings={settings}
        onSettingsChange={onSettingsChange}
        settingsExpanded={settingsExpanded}
        onToggleSettings={onToggleSettings}
        fixingIssueId={fixingIssueId}
        showCloseButton={true}
      />
    </aside>
  );
}
