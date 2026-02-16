export function isContinueSkill(skillId: string): boolean {
  const parts = skillId.split(":");
  return (parts[parts.length - 1] ?? skillId) === "continue";
}

/**
 * Map judge severity to tokenized text color classes.
 */
export function judgeSeverityClass(severity: "high" | "medium" | "low"): string {
  if (severity === "high") {
    return "text-[var(--color-error)]";
  }
  if (severity === "medium") {
    return "text-[var(--color-fg-default)]";
  }
  return "text-[var(--color-fg-muted)]";
}

export function formatTokenValue(value: number): string {
  return Math.max(0, Math.trunc(value)).toLocaleString("en-US");
}

export function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

export function formatSelectionPreview(text: string, maxChars = 120): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}...`;
}
