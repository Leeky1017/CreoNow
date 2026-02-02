import { Text } from "../../components/primitives";

/**
 * Available AI models
 */
export type AiModel = "gpt-5.2" | "creo-w" | "deepseek" | "claude-opus";

const MODELS: { id: AiModel; name: string; provider: string }[] = [
  { id: "gpt-5.2", name: "GPT-5.2", provider: "OpenAI" },
  { id: "creo-w", name: "CreoW", provider: "CreoNow" },
  { id: "deepseek", name: "DeepSeek", provider: "DeepSeek" },
  { id: "claude-opus", name: "Claude Opus", provider: "Anthropic" },
];

type ModelPickerProps = {
  open: boolean;
  selectedModel: AiModel;
  onOpenChange: (open: boolean) => void;
  onSelectModel: (model: AiModel) => void;
};

/**
 * ModelPicker renders a dropdown to select the AI model.
 */
export function ModelPicker(props: ModelPickerProps): JSX.Element | null {
  if (!props.open) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        onClick={() => props.onOpenChange(false)}
        className="fixed inset-0 z-20"
      />
      {/* Popup - positioned above the button */}
      <div
        role="dialog"
        aria-label="Select Model"
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-full left-0 mb-1 w-48 z-30 bg-[var(--color-bg-raised)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] shadow-[0_18px_48px_rgba(0,0,0,0.45)] overflow-hidden"
      >
        <div className="px-2.5 py-2 border-b border-[var(--color-border-default)]">
          <Text size="tiny" color="muted" className="uppercase tracking-wide">
            Model
          </Text>
        </div>

        <div className="py-1">
          {MODELS.map((model) => {
            const selected = model.id === props.selectedModel;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => props.onSelectModel(model.id)}
                className={`
                  w-full px-2.5 py-1.5 text-left flex items-center justify-between
                  hover:bg-[var(--color-bg-hover)] transition-colors
                  ${selected ? "bg-[var(--color-bg-selected)]" : ""}
                `}
              >
                <div>
                  <Text size="small" className="text-[var(--color-fg-default)]">
                    {model.name}
                  </Text>
                  <Text size="tiny" color="muted" className="block">
                    {model.provider}
                  </Text>
                </div>
                {selected && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-[var(--color-fg-accent)] shrink-0"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

/**
 * Get display name for a model
 */
export function getModelName(model: AiModel): string {
  return MODELS.find((m) => m.id === model)?.name ?? model;
}
