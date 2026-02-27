/**
 * Return current epoch milliseconds.
 *
 * Why: keep runtime timestamp sourcing centralized across main/preload modules.
 */
export function nowTs(): number {
  return Date.now();
}
