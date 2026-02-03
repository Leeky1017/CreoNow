/**
 * SettingsDialog feature module
 *
 * Full-featured settings dialog with tabbed navigation.
 * Includes General, Appearance, Export & Share, and Account pages.
 */

export { SettingsDialog } from "./SettingsDialog";
export type {
  SettingsDialogProps,
  SettingsTab,
  AllSettings,
} from "./SettingsDialog";

// Re-export page components for standalone use
export { SettingsGeneral, defaultGeneralSettings } from "./SettingsGeneral";
export type { GeneralSettings, SettingsGeneralProps } from "./SettingsGeneral";

export {
  SettingsAppearancePage,
  defaultAppearanceSettings,
} from "./SettingsAppearancePage";
export type {
  AppearanceSettings,
  ThemeMode,
  SettingsAppearancePageProps,
} from "./SettingsAppearancePage";

export { SettingsExport, defaultExportSettings } from "./SettingsExport";
export type {
  ExportSettings,
  ExportFormat,
  SettingsExportProps,
} from "./SettingsExport";

export { SettingsAccount, defaultAccountSettings } from "./SettingsAccount";
export type {
  AccountSettings,
  SubscriptionPlan,
  SettingsAccountProps,
} from "./SettingsAccount";
