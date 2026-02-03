import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button, Text } from "../../components/primitives";
import { SettingsGeneral, GeneralSettings, defaultGeneralSettings } from "./SettingsGeneral";
import {
  SettingsAppearancePage,
  AppearanceSettings,
  defaultAppearanceSettings,
} from "./SettingsAppearancePage";
import { SettingsExport, ExportSettings, defaultExportSettings } from "./SettingsExport";
import { SettingsAccount, AccountSettings, defaultAccountSettings } from "./SettingsAccount";

/**
 * Settings tab values
 */
export type SettingsTab = "general" | "appearance" | "export" | "account";

/**
 * Complete settings state
 */
export interface AllSettings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  export: ExportSettings;
}

/**
 * SettingsDialog props
 */
export interface SettingsDialogProps {
  /** Controlled open state */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Initial settings values */
  initialSettings?: AllSettings;
  /** Callback when settings are saved */
  onSave?: (settings: AllSettings) => void;
  /** Account information */
  account?: AccountSettings;
  /** Callback when upgrade is requested */
  onUpgrade?: () => void;
  /** Callback when logout is requested */
  onLogout?: () => void;
  /** Initial active tab */
  defaultTab?: SettingsTab;
}

/**
 * Nav item configuration
 */
const navItems: { value: SettingsTab; label: string }[] = [
  { value: "general", label: "General" },
  { value: "appearance", label: "Appearance" },
  { value: "export", label: "Export & Share" },
  { value: "account", label: "Account" },
];

/**
 * Overlay styles
 */
const overlayStyles = [
  "fixed",
  "inset-0",
  "z-[var(--z-modal)]",
  "bg-[rgba(0,0,0,0.75)]",
  "backdrop-blur-sm",
  "transition-opacity",
  "duration-[var(--duration-normal)]",
  "ease-[var(--ease-default)]",
  "data-[state=open]:opacity-100",
  "data-[state=closed]:opacity-0",
].join(" ");

/**
 * Content styles
 */
const contentStyles = [
  "fixed",
  "left-1/2",
  "top-1/2",
  "-translate-x-1/2",
  "-translate-y-1/2",
  "z-[var(--z-modal)]",
  "w-[1000px]",
  "h-[700px]",
  "bg-[var(--color-bg-surface)]",
  "border",
  "border-[var(--color-border-default)]",
  "rounded-[var(--radius-lg)]",
  "shadow-2xl",
  "flex",
  "overflow-hidden",
  // Animation
  "transition-[opacity,transform]",
  "duration-[var(--duration-normal)]",
  "ease-[var(--ease-default)]",
  "data-[state=open]:opacity-100",
  "data-[state=open]:scale-100",
  "data-[state=closed]:opacity-0",
  "data-[state=closed]:scale-95",
  "focus:outline-none",
].join(" ");

/**
 * Sidebar styles
 */
const sidebarStyles = [
  "w-[260px]",
  "bg-[var(--color-bg-base)]",
  "border-r",
  "border-[var(--color-border-default)]",
  "flex",
  "flex-col",
  "py-8",
  "shrink-0",
].join(" ");

/**
 * Nav button styles
 */
const navButtonBaseStyles = [
  "w-full",
  "text-left",
  "px-8",
  "py-3",
  "text-[13px]",
  "border-r-2",
  "transition-all",
  "duration-[var(--duration-fast)]",
].join(" ");

/**
 * Close button styles
 */
const closeButtonStyles = [
  "absolute",
  "top-6",
  "right-8",
  "p-2",
  "text-[var(--color-fg-placeholder)]",
  "hover:text-[var(--color-fg-default)]",
  "transition-colors",
  "z-10",
  "hover:bg-[var(--color-bg-hover)]",
  "rounded-full",
].join(" ");

/**
 * SettingsDialog component
 *
 * A full-featured settings dialog with tabbed navigation.
 * Supports General, Appearance, Export & Share, and Account pages.
 *
 * @example
 * ```tsx
 * <SettingsDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onSave={handleSave}
 * />
 * ```
 */
export function SettingsDialog({
  open,
  onOpenChange,
  initialSettings,
  onSave,
  account = defaultAccountSettings,
  onUpgrade,
  onLogout,
  defaultTab = "general",
}: SettingsDialogProps): JSX.Element {
  // Active tab state
  const [activeTab, setActiveTab] = React.useState<SettingsTab>(defaultTab);

  // Settings state (local copy for editing)
  const [settings, setSettings] = React.useState<AllSettings>({
    general: initialSettings?.general ?? defaultGeneralSettings,
    appearance: initialSettings?.appearance ?? defaultAppearanceSettings,
    export: initialSettings?.export ?? defaultExportSettings,
  });

  // Track if settings have been modified (reserved for unsaved changes warning)
  const [_isDirty, setIsDirty] = React.useState(false);
  void _isDirty; // Will be used for unsaved changes warning dialog

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
      setSettings({
        general: initialSettings?.general ?? defaultGeneralSettings,
        appearance: initialSettings?.appearance ?? defaultAppearanceSettings,
        export: initialSettings?.export ?? defaultExportSettings,
      });
      setIsDirty(false);
    }
  }, [open, initialSettings, defaultTab]);

  const handleSettingsChange = <K extends keyof AllSettings>(
    key: K,
    value: AllSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave?.(settings);
    setIsDirty(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <SettingsGeneral
            settings={settings.general}
            onSettingsChange={(value) => handleSettingsChange("general", value)}
          />
        );
      case "appearance":
        return (
          <SettingsAppearancePage
            settings={settings.appearance}
            onSettingsChange={(value) =>
              handleSettingsChange("appearance", value)
            }
          />
        );
      case "export":
        return (
          <SettingsExport
            settings={settings.export}
            onSettingsChange={(value) => handleSettingsChange("export", value)}
          />
        );
      case "account":
        return (
          <SettingsAccount
            account={account}
            onUpgrade={onUpgrade}
            onLogout={onLogout}
          />
        );
      default:
        return null;
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlayStyles} />
        <DialogPrimitive.Content className={contentStyles}>
          {/* Sidebar Navigation */}
          <div className={sidebarStyles}>
            <div className="px-8 mb-8">
              <Text
                size="label"
                color="placeholder"
                weight="semibold"
                className="tracking-[0.15em]"
              >
                Settings
              </Text>
            </div>

            <nav className="flex flex-col w-full">
              {navItems.map(({ value, label }) => {
                const isActive = activeTab === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setActiveTab(value)}
                    className={`${navButtonBaseStyles} ${
                      isActive
                        ? "text-[var(--color-fg-default)] bg-[var(--color-bg-hover)] border-[var(--color-fg-default)]"
                        : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-surface)] border-transparent"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>

            {/* Logout button at bottom */}
            <div className="mt-auto px-8">
              <div className="pt-6 border-t border-[var(--color-border-default)]">
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-2 text-[12px] text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-default)] transition-colors"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-[var(--color-bg-surface)] flex flex-col relative min-w-0">
            {/* Close button */}
            <DialogPrimitive.Close className={closeButtonStyles}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-12 py-10">
              {renderContent()}
            </div>

            {/* Footer with Save/Cancel */}
            <div className="p-8 border-t border-[var(--color-border-default)] flex justify-end gap-3 bg-[var(--color-bg-surface)]">
              <Button variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>

          {/* Hidden title for accessibility */}
          <DialogPrimitive.Title className="sr-only">
            Settings
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Configure your application settings including general preferences,
            appearance, export options, and account settings.
          </DialogPrimitive.Description>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// Re-export types and defaults
export { defaultGeneralSettings } from "./SettingsGeneral";
export { defaultAppearanceSettings } from "./SettingsAppearancePage";
export { defaultExportSettings } from "./SettingsExport";
export { defaultAccountSettings } from "./SettingsAccount";
export type { GeneralSettings } from "./SettingsGeneral";
export type { AppearanceSettings, ThemeMode } from "./SettingsAppearancePage";
export type { ExportSettings, ExportFormat } from "./SettingsExport";
export type { AccountSettings, SubscriptionPlan } from "./SettingsAccount";
