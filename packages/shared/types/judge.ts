export const JUDGE_RESULT_CHANNEL = "judge:quality:result" as const;

export type JudgeSeverity = "high" | "medium" | "low";

export type JudgeResultEvent = {
  projectId: string;
  traceId: string;
  severity: JudgeSeverity;
  labels: string[];
  summary: string;
  partialChecksSkipped: boolean;
  ts: number;
};
