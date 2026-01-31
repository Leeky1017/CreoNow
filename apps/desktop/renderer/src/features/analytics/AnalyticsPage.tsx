import React from "react";

import type { IpcError } from "../../../../../../packages/shared/types/ipc-generated";
import { invoke } from "../../lib/ipcClient";

type StatsSummary = {
  wordsWritten: number;
  writingSeconds: number;
  skillsUsed: number;
  documentsCreated: number;
};

type StatsDay = {
  date: string;
  summary: StatsSummary;
};

function utcDateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

/**
 * AnalyticsPage shows basic writing and usage stats.
 *
 * Why: P1 requires a minimal, testable surface to validate stats persistence
 * and IPC query semantics (today + range).
 */
export function AnalyticsPage(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element | null {
  const [today, setToday] = React.useState<StatsDay | null>(null);
  const [rangeSummary, setRangeSummary] = React.useState<StatsSummary | null>(
    null,
  );
  const [error, setError] = React.useState<IpcError | null>(null);

  const refresh = React.useCallback(async () => {
    setError(null);

    const todayRes = await invoke("stats:getToday", {});
    if (!todayRes.ok) {
      setError(todayRes.error);
      return;
    }
    setToday(todayRes.data);

    const to = utcDateKey(Date.now());
    const from = utcDateKey(Date.now() - 6 * 24 * 60 * 60 * 1000);
    const rangeRes = await invoke("stats:getRange", { from, to });
    if (!rangeRes.ok) {
      setError(rangeRes.error);
      return;
    }
    setRangeSummary(rangeRes.data.summary);
  }, []);

  React.useEffect(() => {
    if (!props.open) {
      return;
    }
    void refresh();
  }, [props.open, refresh]);

  if (!props.open) {
    return null;
  }

  return (
    <div className="cn-overlay" onClick={() => props.onOpenChange(false)}>
      <div
        data-testid="analytics-page"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 720,
          maxWidth: "92vw",
          maxHeight: "82vh",
          overflow: "auto",
          background: "var(--color-bg-raised)",
          border: "1px solid var(--color-border-default)",
          borderRadius: "var(--radius-lg)",
          padding: 16,
          color: "var(--color-fg-default)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <header style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Analytics</div>
          <button
            type="button"
            onClick={() => void refresh()}
            style={{
              marginLeft: "auto",
              height: 28,
              padding: "0 var(--space-3)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-default)",
              background: "var(--color-bg-surface)",
              color: "var(--color-fg-default)",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Refresh
          </button>
        </header>

        {error ? (
          <div
            data-testid="analytics-error"
            style={{ fontSize: 12, color: "var(--color-fg-muted)" }}
          >
            {error.code}: {error.message}
          </div>
        ) : null}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <div
            style={{
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-md)",
              padding: 12,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--color-fg-muted)" }}>
              Today words
            </div>
            <div
              data-testid="analytics-today-words"
              style={{ fontSize: 20, fontWeight: 600 }}
            >
              {today ? today.summary.wordsWritten : 0}
            </div>
          </div>
          <div
            style={{
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-md)",
              padding: 12,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--color-fg-muted)" }}>
              Today time
            </div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              {today ? formatSeconds(today.summary.writingSeconds) : "0s"}
            </div>
          </div>
          <div
            style={{
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-md)",
              padding: 12,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--color-fg-muted)" }}>
              Today skills
            </div>
            <div
              data-testid="analytics-today-skills"
              style={{ fontSize: 20, fontWeight: 600 }}
            >
              {today ? today.summary.skillsUsed : 0}
            </div>
          </div>
          <div
            style={{
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-md)",
              padding: 12,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--color-fg-muted)" }}>
              Today docs
            </div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              {today ? today.summary.documentsCreated : 0}
            </div>
          </div>
        </section>

        <section
          style={{
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            padding: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
            Range (last 7d)
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <div style={{ fontSize: 12 }}>
              words: {rangeSummary?.wordsWritten ?? 0}
            </div>
            <div style={{ fontSize: 12 }}>
              skills: {rangeSummary?.skillsUsed ?? 0}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
