import React from "react";

import type { ProjectListItem } from "../../stores/projectStore";

export interface ProjectSwitcherProps {
  currentProjectId: string | null;
  projects: ProjectListItem[];
  onSwitch: (projectId: string) => Promise<void>;
}

/**
 * ProjectSwitcher lets users switch between projects with a delayed progress bar.
 *
 * Why: PM-2 requires a visible loading indicator when switching takes >1s.
 */
export function ProjectSwitcher(props: ProjectSwitcherProps): JSX.Element {
  const [switching, setSwitching] = React.useState(false);
  const [showProgress, setShowProgress] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextProjectId = event.target.value;
      if (switching || !nextProjectId || nextProjectId === props.currentProjectId) {
        return;
      }

      setSwitching(true);
      setShowProgress(false);
      timerRef.current = window.setTimeout(() => {
        setShowProgress(true);
      }, 1000);

      void props.onSwitch(nextProjectId).finally(() => {
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setShowProgress(false);
        setSwitching(false);
      });
    },
    [props, switching],
  );

  React.useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full">
      {showProgress ? (
        <div
          data-testid="project-switcher-progress"
          className="absolute left-0 top-0 h-[2px] w-full overflow-hidden bg-[var(--color-border-default)]"
        >
          <div className="h-full w-1/3 animate-pulse bg-[var(--color-fg-default)]" />
        </div>
      ) : null}

      <select
        data-testid="project-switcher-select"
        value={props.currentProjectId ?? ""}
        onChange={handleChange}
        disabled={switching}
        className="h-8 min-w-[220px] rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-xs text-[var(--color-fg-default)]"
      >
        {props.currentProjectId ? null : (
          <option value="" disabled>
            选择项目
          </option>
        )}
        {props.projects.map((project) => (
          <option key={project.projectId} value={project.projectId}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
}
