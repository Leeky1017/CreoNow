import { useThemeStore } from "../../stores/themeStore";

/**
 * AppearanceSection controls theme preferences.
 *
 * Why: theme switching must be persistent and testable (Windows E2E) without
 * hardcoding colors outside design tokens.
 */
export function AppearanceSection(): JSX.Element {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <section
      data-testid="settings-appearance-section"
      style={{
        padding: 12,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-default)",
        background: "var(--color-bg-raised)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700 }}>Appearance</div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>Theme</div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            data-testid="theme-mode-dark"
            type="button"
            onClick={() => setMode("dark")}
            style={{
              height: 28,
              padding: "0 var(--space-3)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-default)",
              background:
                mode === "dark"
                  ? "var(--color-bg-selected)"
                  : "var(--color-bg-surface)",
              color: "var(--color-fg-default)",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Dark
          </button>
          <button
            data-testid="theme-mode-light"
            type="button"
            onClick={() => setMode("light")}
            style={{
              height: 28,
              padding: "0 var(--space-3)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-default)",
              background:
                mode === "light"
                  ? "var(--color-bg-selected)"
                  : "var(--color-bg-surface)",
              color: "var(--color-fg-default)",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Light
          </button>
        </div>
      </div>
    </section>
  );
}

