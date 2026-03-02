import { useRef, useState, useEffect, useCallback } from "react";

/**
 * Detects whether a container's content overflows its visible width.
 *
 * Uses ResizeObserver to react to layout changes. Returns a boolean
 * `isOverflowing` that is true when `scrollWidth > clientWidth`.
 *
 * Usage:
 * ```tsx
 * const { containerRef, isOverflowing } = useOverflowDetection();
 * return <div ref={containerRef}>...</div>;
 * ```
 */
export function useOverflowDetection(): {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isOverflowing: boolean;
} {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setIsOverflowing(el.scrollWidth > el.clientWidth);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Check once on mount
    checkOverflow();

    // Observe resize
    const observer = new ResizeObserver(() => {
      checkOverflow();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [checkOverflow]);

  return { containerRef, isOverflowing };
}
