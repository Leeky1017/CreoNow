import { useEffect } from 'react';

interface ShortcutOptions {
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
}

export function useKeyboardShortcut(
  key: string,
  handler: () => void,
  options?: ShortcutOptions,
): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (options?.meta && !e.metaKey) return;
      if (options?.ctrl && !e.ctrlKey) return;
      if (options?.shift && !e.shiftKey) return;
      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        handler();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, handler, options?.meta, options?.ctrl, options?.shift]);
}
