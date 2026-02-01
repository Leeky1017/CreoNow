import React from "react";

import type { IpcError } from "../../../../../../packages/shared/types/ipc-generated";
import { Button } from "../../components/primitives/Button";
import { Card } from "../../components/primitives/Card";
import { Dialog } from "../../components/primitives/Dialog";
import { Heading } from "../../components/primitives/Heading";
import { Text } from "../../components/primitives/Text";
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
 * StatCard displays a single statistic with label and value.
 */
function StatCard(props: {
  label: string;
  value: React.ReactNode;
  testId?: string;
}): JSX.Element {
  return (
    <Card className="p-3 rounded-[var(--radius-md)]">
      <Text size="tiny" color="muted">
        {props.label}
      </Text>
      <div
        data-testid={props.testId}
        className="text-xl font-semibold text-[var(--color-fg-default)]"
      >
        {props.value}
      </div>
    </Card>
  );
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
}): JSX.Element {
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

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Analytics"
    >
      <div data-testid="analytics-page" className="flex flex-col gap-3.5">
        <header className="flex items-baseline gap-2.5">
          <Heading level="h3" className="font-extrabold">
            Statistics
          </Heading>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refresh()}
            className="ml-auto"
          >
            Refresh
          </Button>
        </header>

        {error ? (
          <Text data-testid="analytics-error" size="small" color="muted">
            {error.code}: {error.message}
          </Text>
        ) : null}

        <section className="grid grid-cols-4 gap-2.5">
          <StatCard
            label="Today words"
            value={today ? today.summary.wordsWritten : 0}
            testId="analytics-today-words"
          />
          <StatCard
            label="Today time"
            value={today ? formatSeconds(today.summary.writingSeconds) : "0s"}
          />
          <StatCard
            label="Today skills"
            value={today ? today.summary.skillsUsed : 0}
            testId="analytics-today-skills"
          />
          <StatCard
            label="Today docs"
            value={today ? today.summary.documentsCreated : 0}
          />
        </section>

        <Card className="p-3 rounded-[var(--radius-md)]">
          <Text size="small" color="muted">
            Range (last 7d)
          </Text>
          <div className="flex gap-3 mt-1.5">
            <Text size="small">words: {rangeSummary?.wordsWritten ?? 0}</Text>
            <Text size="small">skills: {rangeSummary?.skillsUsed ?? 0}</Text>
          </div>
        </Card>
      </div>
    </Dialog>
  );
}
