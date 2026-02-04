import type { SkillListItem } from "../../stores/aiStore";
import { Text } from "../../components/primitives";

/**
 * SkillPicker renders the AI Panel skills popup list.
 */
export function SkillPicker(props: {
  open: boolean;
  items: SkillListItem[];
  selectedSkillId: string;
  onOpenChange: (open: boolean) => void;
  onSelectSkillId: (skillId: string) => void;
  onOpenSettings?: () => void;
}): JSX.Element | null {
  if (!props.open) {
    return null;
  }

  return (
    <>
      {/* Backdrop to close on click outside */}
      <div
        role="presentation"
        onClick={() => props.onOpenChange(false)}
        className="fixed inset-0 z-20"
      />
      {/* Popup - positioned above the button */}
      <div
        role="dialog"
        aria-label="SKILL"
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-full left-0 mb-1 w-56 p-2.5 z-30 bg-[var(--color-bg-raised)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] shadow-[0_18px_48px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center justify-between">
          <Text size="label" color="muted">
            SKILL
          </Text>
          <button
            type="button"
            title="SKILL Settings"
            className="w-5 h-5 flex items-center justify-center text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-hover)] rounded transition-colors"
            onClick={() => {
              props.onOpenSettings?.();
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col mt-2 gap-1.5 max-h-65 overflow-auto">
          {props.items.map((s) => {
            const selected = s.id === props.selectedSkillId;
            const disabled = !s.enabled || !s.valid;
            const subtitle = !s.enabled
              ? "Disabled"
              : !s.valid
                ? "Invalid"
                : s.scope;
            return (
              <button
                key={s.id}
                data-testid={`ai-skill-${s.id}`}
                type="button"
                disabled={disabled}
                onClick={() => props.onSelectSkillId(s.id)}
                className={`
                  flex flex-col gap-0.5 text-left px-2.5 py-2 rounded-[10px] border
                  transition-colors duration-[var(--duration-fast)] ease-[var(--ease-default)]
                  ${
                    selected
                      ? "border-[var(--color-border-accent)] bg-[var(--color-bg-base)]"
                      : "border-[var(--color-border-default)] bg-[var(--color-bg-raised)]"
                  }
                  ${
                    disabled
                      ? "text-[var(--color-fg-muted)] cursor-not-allowed"
                      : "text-[var(--color-fg-default)] cursor-pointer hover:border-[var(--color-border-hover)]"
                  }
                `}
              >
                <Text
                  size="small"
                  weight="semibold"
                  color={disabled ? "muted" : "default"}
                >
                  {s.name}
                </Text>
                <Text size="tiny" color="muted">
                  {subtitle}
                </Text>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
