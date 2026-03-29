import { useCallback, useRef } from 'react';
import { cn } from '@/lib/cn';

export interface DragResizeHandleProps {
  direction: 'left' | 'right';
  onResize: (delta: number) => void;
  className?: string;
}

export function DragResizeHandle({ direction, onResize, className }: DragResizeHandleProps) {
  const dragging = useRef(false);
  const startX = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;

      const handleMouseMove = (me: MouseEvent) => {
        if (!dragging.current) return;
        const delta = me.clientX - startX.current;
        startX.current = me.clientX;
        const adjustedDelta = direction === 'right' ? -delta : delta;
        onResize(adjustedDelta);
      };

      const handleMouseUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [direction, onResize],
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        'w-1 shrink-0 cursor-col-resize',
        'bg-transparent hover:bg-accent/30',
        'transition-colors duration-fast ease-out',
        className,
      )}
      role="separator"
      aria-orientation="vertical"
    />
  );
}
