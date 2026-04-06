const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const WEEK = 604_800_000;

const formatterCache = new Map<string, Intl.RelativeTimeFormat>();

function getFormatter(locale: string): Intl.RelativeTimeFormat {
  const cached = formatterCache.get(locale);
  if (cached) {
    return cached;
  }
  const created = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  formatterCache.set(locale, created);
  return created;
}

/**
 * Format a timestamp as a locale-aware relative time.
 * Falls back to the raw string if parsing fails.
 */
export function formatRelativeTime(input: number | string, locale?: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return typeof input === "string" ? input : String(input);
  }

  const resolvedLocale =
    locale ?? (typeof navigator !== "undefined" ? navigator.language : "zh");

  const diff = Date.now() - date.getTime();
  const rtf = getFormatter(resolvedLocale);

  if (diff < MINUTE) return rtf.format(0, "second");
  if (diff < HOUR) return rtf.format(-Math.floor(diff / MINUTE), "minute");
  if (diff < DAY) return rtf.format(-Math.floor(diff / HOUR), "hour");
  if (diff < WEEK) return rtf.format(-Math.floor(diff / DAY), "day");
  return rtf.format(-Math.floor(diff / WEEK), "week");
}

export function __getFormatterCacheSizeForTests(): number {
  return formatterCache.size;
}

export function __resetFormatterCacheForTests(): void {
  formatterCache.clear();
}
