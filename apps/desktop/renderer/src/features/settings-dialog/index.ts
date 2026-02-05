/**
 * SettingsDialog feature module
 *
 * Single-path settings dialog surface used by the app.
 * Includes Appearance/Proxy/Judge/Analytics entry points.
 */

export { SettingsDialog } from "./SettingsDialog";
export type { SettingsDialogProps, SettingsTab } from "./SettingsDialog";

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
