import React from "react";

/**
 * Returns a debounced version of the given callback.
 *
 * While a pending timer is active, subsequent calls are silently dropped.
 * After `delayMs` elapses the guard resets and the next call goes through.
 *
 * Why: layout shortcut keys (Cmd/Ctrl+\, Cmd/Ctrl+L) need 300ms debounce to
 * prevent rapid toggling from producing unpredictable UI state.
 */
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return React.useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) return;
      callback(...args);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
      }, delayMs);
    },
    [callback, delayMs],
  );
}
