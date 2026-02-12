/**
 * Shared accessibility attributes for editor toggle buttons.
 *
 * Why: fixed toolbar and bubble menu must expose identical ARIA semantics so
 * screen readers announce state consistently across both entry points.
 */
export function createToggleButtonA11yProps(args: {
  label: string;
  pressed?: boolean;
}): {
  "aria-label": string;
  "aria-pressed": boolean;
} {
  return {
    "aria-label": args.label,
    "aria-pressed": Boolean(args.pressed),
  };
}
