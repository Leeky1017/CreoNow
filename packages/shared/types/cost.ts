export const COST_ALERT_CHANNEL = "cost:alert" as const;

export type CostAlertEvent = {
  kind: "warning" | "hard-stop";
  currentCost: number;
  threshold: number;
  message: string;
  timestamp: number;
};
