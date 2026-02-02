import React from "react";
import { DiffHeader, type DiffViewMode, type VersionInfo } from "./DiffHeader";
import { DiffFooter } from "./DiffFooter";
import {
  UnifiedDiffView,
  parseDiffLines,
  getChangePositions,
  type DiffStats,
} from "./DiffView";
import { SplitDiffView } from "./SplitDiffView";

type DiffViewPanelProps = {
  /** The unified diff text */
  diffText: string;
  /** Available versions for comparison */
  versions?: VersionInfo[];
  /** Initial view mode */
  initialViewMode?: DiffViewMode;
  /** Callback when panel is closed */
  onClose?: () => void;
  /** Callback when restore is requested */
  onRestore?: () => void;
  /** Whether restore is in progress */
  restoreInProgress?: boolean;
  /** Panel width (for responsive layout) */
  width?: number;
  /** Panel height */
  height?: number | string;
};

/**
 * Default mock versions for demonstration.
 */
const defaultVersions: VersionInfo[] = [
  { id: "2h", label: "Version from 2h ago", type: "auto" },
  { id: "yesterday", label: "Yesterday, 4:20 PM", type: "manual" },
  { id: "current", label: "Current Version", type: "current" },
];

/**
 * DiffViewPanel is the complete diff viewer component.
 *
 * Combines:
 * - DiffHeader (version selection, view toggle, navigation)
 * - UnifiedDiffView or SplitDiffView (content)
 * - DiffFooter (statistics, action buttons)
 */
export function DiffViewPanel(props: DiffViewPanelProps): JSX.Element {
  const versions = props.versions ?? defaultVersions;

  // Parse diff
  const { lines, stats } = React.useMemo(
    () => parseDiffLines(props.diffText),
    [props.diffText],
  );

  // Get change positions for navigation
  const changePositions = React.useMemo(
    () => getChangePositions(lines),
    [lines],
  );

  // State
  const [viewMode, setViewMode] = React.useState<DiffViewMode>(
    props.initialViewMode ?? "unified",
  );
  const [currentChangeIndex, setCurrentChangeIndex] = React.useState(0);
  const [selectedBeforeVersion, setSelectedBeforeVersion] = React.useState(
    versions.find((v) => v.type !== "current")?.id ?? versions[0]?.id ?? "",
  );
  const [selectedAfterVersion] = React.useState(
    versions.find((v) => v.type === "current")?.id ?? "current",
  );

  // Navigation handlers
  const handlePreviousChange = (): void => {
    setCurrentChangeIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextChange = (): void => {
    setCurrentChangeIndex((prev) =>
      Math.min(changePositions.length - 1, prev + 1),
    );
  };

  // Close handler
  const handleClose = (): void => {
    props.onClose?.();
  };

  // Restore handler
  const handleRestore = (): void => {
    props.onRestore?.();
  };

  return (
    <div
      className="flex flex-col bg-[var(--color-bg-raised)] border border-[var(--color-border-default)] rounded-xl shadow-2xl overflow-hidden"
      style={{
        width: props.width ?? "100%",
        height: props.height ?? "100%",
      }}
    >
      {/* Header */}
      <DiffHeader
        versions={versions}
        selectedBeforeVersion={selectedBeforeVersion}
        selectedAfterVersion={selectedAfterVersion}
        onBeforeVersionChange={setSelectedBeforeVersion}
        onAfterVersionChange={() => {}}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        currentChangeIndex={currentChangeIndex}
        totalChanges={changePositions.length}
        onPreviousChange={handlePreviousChange}
        onNextChange={handleNextChange}
        onClose={handleClose}
      />

      {/* Content */}
      {viewMode === "unified" ? (
        <UnifiedDiffView
          lines={lines}
          currentChangeIndex={currentChangeIndex}
          changePositions={changePositions}
        />
      ) : (
        <SplitDiffView
          lines={lines}
          currentChangeIndex={currentChangeIndex}
          changePositions={changePositions}
        />
      )}

      {/* Footer */}
      <DiffFooter
        stats={stats}
        onClose={handleClose}
        onRestore={handleRestore}
        restoreInProgress={props.restoreInProgress}
      />
    </div>
  );
}

// Re-export types for external use
export type { DiffViewMode, VersionInfo, DiffStats };
