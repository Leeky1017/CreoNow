import React from "react";

type ResizerProps = {
  testId: string;
  getStartWidth: () => number;
  onDrag: (deltaX: number, startWidth: number) => number;
  onCommit: (nextWidth: number) => void;
  onDoubleClick: () => void;
};

/**
 * Resizer implements the 8px hit-area drag handle between panels.
 *
 * Design spec §7.3: Resizer has 8px hit area, 1px visual line (2px on hover).
 * Uses cn-resizer class defined in main.css.
 */
export function Resizer(props: ResizerProps): JSX.Element {
  const draggingRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const startWidthRef = React.useRef(0);
  const lastWidthRef = React.useRef(0);

  React.useEffect(() => {
    function onMouseMove(e: MouseEvent): void {
      if (!draggingRef.current) {
        return;
      }
      const deltaX = e.clientX - startXRef.current;
      const next = props.onDrag(deltaX, startWidthRef.current);
      lastWidthRef.current = next;
      props.onCommit(next);
    }

    function onMouseUp(): void {
      if (!draggingRef.current) {
        return;
      }
      draggingRef.current = false;
      props.onCommit(lastWidthRef.current);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [props]);

  return (
    <div
      data-testid={props.testId}
      className="cn-resizer"
      onMouseDown={(e) => {
        draggingRef.current = true;
        startXRef.current = e.clientX;
        startWidthRef.current = props.getStartWidth();
        lastWidthRef.current = startWidthRef.current;
      }}
      onDoubleClick={() => props.onDoubleClick()}
      role="separator"
      aria-orientation="vertical"
      tabIndex={0}
    />
  );
}
