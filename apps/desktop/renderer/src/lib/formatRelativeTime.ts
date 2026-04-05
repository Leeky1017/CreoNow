const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const WEEK = 604_800_000;

/**
 * Format an ISO timestamp string as a locale-aware relative time.
 * Falls back to the raw string if parsing fails.
 */
export function formatRelativeTime(iso: string, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const resolvedLocale =
    locale ?? (typeof navigator !== "undefined" ? navigator.language : "zh");

  const now = Date.now();
  const diff = now - date.getTime();

  const rtf = new Intl.RelativeTimeFormat(resolvedLocale, { numeric: "auto" });

  if (diff < MINUTE) return rtf.format(0, "second");
  if (diff < HOUR) return rtf.format(-Math.floor(diff / MINUTE), "minute");
  if (diff < DAY) return rtf.format(-Math.floor(diff / HOUR), "hour");
  if (diff < WEEK) return rtf.format(-Math.floor(diff / DAY), "day");
  return rtf.format(-Math.floor(diff / WEEK), "week");
}
