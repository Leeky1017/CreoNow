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
        <Text size="label" color="muted">
          SKILL
        </Text>

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
