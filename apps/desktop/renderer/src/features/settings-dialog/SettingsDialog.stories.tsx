import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { SettingsDialog } from "./SettingsDialog";
import { defaultGeneralSettings } from "./SettingsGeneral";
import { defaultAppearanceSettings } from "./SettingsAppearancePage";
import { defaultExportSettings } from "./SettingsExport";

/**
 * SettingsDialog component stories
 *
 * Comprehensive settings dialog with 4 tabbed pages:
 * - General: Writing experience, data storage, editor defaults
 * - Appearance: Theme, accent color, font size
 * - Export & Share: Default format, export options
 * - Account: Profile, subscription, danger zone
 *
 * Based on design spec: 10-settings.html
 */
const meta: Meta<typeof SettingsDialog> = {
  title: "Features/SettingsDialog",
  component: SettingsDialog,
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      default: "dark",
    },
  },
  argTypes: {
    open: { control: "boolean" },
    onOpenChange: { action: "openChange" },
    onSave: { action: "save" },
    onUpgrade: { action: "upgrade" },
    onLogout: { action: "logout" },
  },
  decorators: [
    (Story) => (
      <div
        className="w-full h-screen bg-[var(--color-bg-base)]"
        data-theme="dark"
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SettingsDialog>;

/**
 * Story 1: GeneralWritingExperience
 *
 * General page with Writing Experience section focused.
 * Validates:
 * - Focus Mode toggle state (default: on)
 * - Typewriter Scroll toggle state (default: off)
 * - Smart Punctuation toggle state (default: on)
 * - Description text styling (13px, muted color)
 */
export const GeneralWritingExperience: Story = {
  args: {
    open: true,
    defaultTab: "general",
    initialSettings: {
      general: defaultGeneralSettings,
      appearance: defaultAppearanceSettings,
      export: defaultExportSettings,
    },
    account: {
      name: "Sarah Mitchell",
      email: "sarah@example.com",
      plan: "pro",
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "General page with Writing Experience section. Focus Mode and Smart Punctuation are ON by default, Typewriter Scroll is OFF.",
      },
    },
  },
};

/**
 * Story 2: GeneralDataStorage
 *
 * General page with Data & Storage section focused.
 * Validates:
 * - Backup Interval dropdown options
 * - Dropdown selection interaction
 * - "Last backup: 2 minutes ago" text
 */
export const GeneralDataStorage: Story = {
  args: {
    open: true,
    defaultTab: "general",
    initialSettings: {
      general: {
        ...defaultGeneralSettings,
        backupInterval: "15min",
      },
      appearance: defaultAppearanceSettings,
      export: defaultExportSettings,
    },
    account: {
      name: "Sarah Mitchell",
      email: "sarah@example.com",
      plan: "pro",
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "General page focused on Data & Storage section. Backup Interval is set to 'Every 15 minutes'.",
      },
    },
  },
};

/**
 * Story 3: GeneralEditorDefaults
 *
 * General page with Editor Defaults section focused.
 * Validates:
 * - Interface Scale slider (80% - 120%)
 * - Slider thumb movement
 * - Default Typography dropdown
 */
export const GeneralEditorDefaults: Story = {
  args: {
    open: true,
    defaultTab: "general",
    initialSettings: {
      general: {
        ...defaultGeneralSettings,
        interfaceScale: 110,
        defaultTypography: "merriweather",
      },
      appearance: defaultAppearanceSettings,
      export: defaultExportSettings,
    },
    account: {
      name: "Sarah Mitchell",
      email: "sarah@example.com",
      plan: "pro",
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "General page with Editor Defaults modified. Interface Scale at 110%, Typography set to Merriweather.",
      },
    },
  },
};

/**
 * Story 4: AppearanceThemeSelection
 *
 * Appearance page with theme selection.
 * Validates:
 * - Light/Dark/System three-way selection
 * - Selected state styling
 * - Theme preview areas
 */
export const AppearanceThemeSelection: Story = {
  args: {
    open: true,
    defaultTab: "appearance",
    initialSettings: {
      general: defaultGeneralSettings,
      appearance: {
        ...defaultAppearanceSettings,
        themeMode: "dark",
      },
      export: defaultExportSettings,
    },
    account: {
      name: "Sarah Mitchell",
      email: "sarah@example.com",
      plan: "pro",
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Appearance page with theme selection. Dark theme is selected by default.",
      },
    },
  },
};

/**
 * Story 5: ExportDefaultSettings
 *
 * Export & Share page with default settings.
 * Validates:
 * - Default export format selection (2x2 grid)
 * - Include Metadata toggle
 * - Auto-generate filename toggle
 */
export const ExportDefaultSettings: Story = {
  args: {
    open: true,
    defaultTab: "export",
    initialSettings: {
      general: defaultGeneralSettings,
      appearance: defaultAppearanceSettings,
      export: defaultExportSettings,
    },
    account: {
      name: "Sarah Mitchell",
      email: "sarah@example.com",
      plan: "pro",
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Export & Share page with default settings. PDF is selected, both metadata and auto-filename are enabled.",
      },
    },
  },
};

/**
 * Story 6: AccountProfileEdit
 *
 * Account page showing user profile.
 * Validates:
 * - Avatar display (initials fallback)
 * - Subscription status "Pro"
 * - Upgrade button styling
 */
export const AccountProfileEdit: Story = {
  args: {
    open: true,
    defaultTab: "account",
    initialSettings: {
      general: defaultGeneralSettings,
      appearance: defaultAppearanceSettings,
      export: defaultExportSettings,
    },
    account: {
      name: "Sarah Mitchell",
      email: "sarah@example.com",
      plan: "pro",
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Account page showing user profile with Pro subscription. Avatar shows initials 'SM'.",
      },
    },
  },
};

/**
 * Story 7: NavigationTransition
 *
 * Testing rapid navigation between tabs.
 * Validates:
 * - Page switching without flicker
 * - Current selection indicator (right border)
 * - State preservation between tabs
 */
export const NavigationTransition: Story = {
  args: {
    open: true,
    defaultTab: "general",
    initialSettings: {
      general: defaultGeneralSettings,
      appearance: defaultAppearanceSettings,
      export: defaultExportSettings,
    },
    account: {
      name: "Sarah Mitchell",
      email: "sarah@example.com",
      plan: "pro",
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Test navigation between tabs. Click General → Appearance → Export → Account rapidly to verify smooth transitions.",
      },
    },
  },
};

/**
 * Story 8: UnsavedChangesWarning (Modified State)
 *
 * Settings with modifications (dirty state).
 * Validates:
 * - Modified settings are tracked
 * - Save Changes button is functional
 * - Cancel returns to previous state
 */
export const UnsavedChangesWarning: Story = {
  args: {
    open: true,
    defaultTab: "general",
    initialSettings: {
      general: {
        ...defaultGeneralSettings,
        focusMode: false, // Changed from default
        typewriterScroll: true, // Changed from default
      },
      appearance: defaultAppearanceSettings,
      export: defaultExportSettings,
    },
    account: {
      name: "Sarah Mitchell",
      email: "sarah@example.com",
      plan: "pro",
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Settings with modifications. Focus Mode is OFF (changed) and Typewriter Scroll is ON (changed). Test Save and Cancel behavior.",
      },
    },
  },
};

/**
 * Story 9: FreeUserAccount
 *
 * Account page for a free tier user.
 * Validates:
 * - Free plan badge
 * - Upgrade to Pro button visible
 * - Different subscription messaging
 */
export const FreeUserAccount: Story = {
  args: {
    open: true,
    defaultTab: "account",
    initialSettings: {
      general: defaultGeneralSettings,
      appearance: defaultAppearanceSettings,
      export: defaultExportSettings,
    },
    account: {
      name: "John Doe",
      email: "john@example.com",
      plan: "free",
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Account page for a free tier user. Shows 'Free' badge and 'Upgrade to Pro' button.",
      },
    },
  },
};
