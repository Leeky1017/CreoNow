import type { SkillListItem } from "../../stores/aiStore";

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
    <div
      role="presentation"
      onClick={() => props.onOpenChange(false)}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
      }}
    >
      <div
        role="dialog"
        aria-label="Skills"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: 36,
          right: 0,
          width: 280,
          maxWidth: "100%",
          background: "var(--color-bg-raised)",
          border: "1px solid var(--color-border-default)",
          borderRadius: "var(--radius-lg)",
          padding: 10,
          boxShadow: "0 18px 48px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--color-fg-muted)",
          }}
        >
          Skills
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 8,
            gap: 6,
            maxHeight: 260,
            overflow: "auto",
          }}
        >
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
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: selected
                    ? "1px solid var(--color-border-accent)"
                    : "1px solid var(--color-border-default)",
                  background: selected
                    ? "var(--color-bg-base)"
                    : "var(--color-bg-raised)",
                  color: disabled
                    ? "var(--color-fg-muted)"
                    : "var(--color-fg-default)",
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "var(--color-fg-muted)" }}>
                  {subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

