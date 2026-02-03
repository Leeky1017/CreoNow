import { Toggle } from "../../components/primitives/Toggle";
import { Text } from "../../components/primitives";

/**
 * Export format types
 */
export type ExportFormat = "pdf" | "markdown" | "word" | "txt";

/**
 * Export settings state
 */
export interface ExportSettings {
  defaultFormat: ExportFormat;
  includeMetadata: boolean;
  autoGenerateFilename: boolean;
}

/**
 * SettingsExport page props
 */
export interface SettingsExportProps {
  /** Current settings values */
  settings: ExportSettings;
  /** Callback when settings change */
  onSettingsChange: (settings: ExportSettings) => void;
}

/**
 * Section label styles
 */
const sectionLabelStyles = [
  "text-[10px]",
  "uppercase",
  "tracking-[0.15em]",
  "text-[var(--color-fg-placeholder)]",
  "font-semibold",
  "mb-6",
].join(" ");

/**
 * Divider styles
 */
const dividerStyles = [
  "w-full",
  "h-px",
  "bg-[var(--color-border-default)]",
  "my-12",
].join(" ");


/**
 * Format icon component
 */
function FormatIcon({ format }: { format: ExportFormat }): JSX.Element {
  const iconMap: Record<ExportFormat, JSX.Element> = {
    pdf: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M10 12h4" />
        <path d="M10 16h4" />
      </svg>
    ),
    markdown: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
        <path d="M7 15V9l3 3 3-3v6" />
        <path d="M17 12l-2 3m2-3l2 3m-2-3V9" />
      </svg>
    ),
    word: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13l2 4 2-4 2 4" />
      </svg>
    ),
    txt: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 12h8" />
        <path d="M8 16h8" />
      </svg>
    ),
  };

  return iconMap[format];
}

/**
 * Format card button styles
 */
const formatCardBaseStyles = [
  "flex",
  "flex-col",
  "items-center",
  "gap-2",
  "p-4",
  "rounded-[var(--radius-md)]",
  "border",
  "cursor-pointer",
  "transition-all",
  "duration-[var(--duration-fast)]",
  "text-[var(--color-fg-muted)]",
].join(" ");

/**
 * SettingsExport page component
 *
 * Export & Share settings page with format selection and export options.
 */
export function SettingsExport({
  settings,
  onSettingsChange,
}: SettingsExportProps): JSX.Element {
  const updateSetting = <K extends keyof ExportSettings>(
    key: K,
    value: ExportSettings[K],
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const formats: { value: ExportFormat; label: string; sublabel: string }[] = [
    { value: "pdf", label: "PDF", sublabel: "Portable Document" },
    { value: "markdown", label: "Markdown", sublabel: ".md" },
    { value: "word", label: "Word", sublabel: ".docx" },
    { value: "txt", label: "Plain Text", sublabel: ".txt" },
  ];

  return (
    <div className="max-w-[560px]">
      {/* Header */}
      <h1 className="text-2xl font-normal text-[var(--color-fg-default)] mb-2 tracking-tight">
        Export & Share
      </h1>
      <p className="text-[var(--color-fg-subtle)] text-sm mb-12 font-light">
        Configure default export format and sharing options.
      </p>

      {/* Default Export Format */}
      <div className="mb-14">
        <h4 className={sectionLabelStyles}>Default Export Format</h4>

        <div className="grid grid-cols-2 gap-4">
          {formats.map(({ value, label, sublabel }) => {
            const isSelected = settings.defaultFormat === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => updateSetting("defaultFormat", value)}
                className={`${formatCardBaseStyles} ${
                  isSelected
                    ? "border-[var(--color-fg-default)] bg-[var(--color-bg-selected)] text-[var(--color-fg-default)]"
                    : "border-[var(--color-border-default)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-hover)]"
                }`}
              >
                <FormatIcon format={value} />
                <div className="flex flex-col items-center">
                  <Text
                    size="small"
                    color={isSelected ? "default" : "muted"}
                    weight="medium"
                  >
                    {label}
                  </Text>
                  <Text size="tiny" color="subtle">
                    {sublabel}
                  </Text>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={dividerStyles} />

      {/* Export Options */}
      <div className="mb-6">
        <h4 className={sectionLabelStyles}>Export Options</h4>

        <div className="flex flex-col gap-8">
          <Toggle
            label="Include Metadata"
            description="Include document title, author, creation date, and word count in exported files."
            checked={settings.includeMetadata}
            onCheckedChange={(checked) =>
              updateSetting("includeMetadata", checked)
            }
          />

          <Toggle
            label="Auto-generate Filename"
            description="Automatically create filenames based on document title and export date."
            checked={settings.autoGenerateFilename}
            onCheckedChange={(checked) =>
              updateSetting("autoGenerateFilename", checked)
            }
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Default export settings
 */
export const defaultExportSettings: ExportSettings = {
  defaultFormat: "pdf",
  includeMetadata: true,
  autoGenerateFilename: true,
};
