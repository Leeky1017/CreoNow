import { useThemeStore } from "../../stores/themeStore";
import { Button } from "../../components/primitives";
import { Heading, Text } from "../../components/primitives";

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
      className="flex flex-col gap-2.5 p-3 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-raised)]"
    >
      <Heading level="h4" className="font-bold">
        Appearance
      </Heading>

      <div className="flex items-center gap-2">
        <Text size="small" color="muted">
          Theme
        </Text>

        <div className="ml-auto flex gap-2">
          <Button
            data-testid="theme-mode-dark"
            variant={mode === "dark" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setMode("dark")}
            className={
              mode === "dark"
                ? "bg-[var(--color-bg-selected)] text-[var(--color-fg-default)]"
                : ""
            }
          >
            Dark
          </Button>
          <Button
            data-testid="theme-mode-light"
            variant={mode === "light" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setMode("light")}
            className={
              mode === "light"
                ? "bg-[var(--color-bg-selected)] text-[var(--color-fg-default)]"
                : ""
            }
          >
            Light
          </Button>
        </div>
      </div>
    </section>
  );
}

