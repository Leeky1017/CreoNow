import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsDialog } from "./SettingsDialog";
import { defaultGeneralSettings } from "./SettingsGeneral";
import { defaultAppearanceSettings } from "./SettingsAppearancePage";
import { defaultExportSettings } from "./SettingsExport";

/**
 * SettingsDialog component tests
 *
 * Tests cover:
 * - Dialog open/close behavior
 * - Tab navigation
 * - Settings state management
 * - Save/Cancel actions
 */
describe("SettingsDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    initialSettings: {
      general: defaultGeneralSettings,
      appearance: defaultAppearanceSettings,
      export: defaultExportSettings,
    },
    account: {
      name: "Test User",
      email: "test@example.com",
      plan: "pro" as const,
    },
  };

  it("renders when open is true", () => {
    render(<SettingsDialog {...defaultProps} />);

    // Check for dialog presence
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Check for navigation items
    expect(screen.getByRole("button", { name: "General" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Appearance" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Export & Share" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(<SettingsDialog {...defaultProps} open={false} />);

    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });

  it("shows General page by default", () => {
    render(<SettingsDialog {...defaultProps} />);

    // Check for General page heading
    expect(
      screen.getByRole("heading", { name: "General", level: 1 }),
    ).toBeInTheDocument();

    // Check for Writing Experience section
    expect(screen.getByText("Writing Experience")).toBeInTheDocument();
    expect(screen.getByText("Focus Mode")).toBeInTheDocument();
  });

  it("navigates to Appearance page when tab is clicked", async () => {
    const user = userEvent.setup();
    render(<SettingsDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Appearance" }));

    expect(
      screen.getByRole("heading", { name: "Appearance", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Theme")).toBeInTheDocument();
  });

  it("navigates to Export & Share page when tab is clicked", async () => {
    const user = userEvent.setup();
    render(<SettingsDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Export & Share" }));

    expect(
      screen.getByRole("heading", { name: "Export & Share", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Default Export Format")).toBeInTheDocument();
  });

  it("navigates to Account page when tab is clicked", async () => {
    const user = userEvent.setup();
    render(<SettingsDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Account" }));

    expect(
      screen.getByRole("heading", { name: "Account", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("calls onOpenChange when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<SettingsDialog {...defaultProps} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onSave with settings when Save Changes is clicked", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <SettingsDialog
        {...defaultProps}
        onSave={onSave}
        onOpenChange={onOpenChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(onSave).toHaveBeenCalledWith({
      general: defaultGeneralSettings,
      appearance: defaultAppearanceSettings,
      export: defaultExportSettings,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("toggles Focus Mode when clicked", async () => {
    const user = userEvent.setup();
    render(<SettingsDialog {...defaultProps} />);

    // Find the Focus Mode toggle (it's a switch button)
    const focusModeToggle = screen.getByRole("switch", { name: /focus mode/i });

    // Initially should be checked (defaultGeneralSettings.focusMode = true)
    expect(focusModeToggle).toHaveAttribute("aria-checked", "true");

    // Click to toggle off
    await user.click(focusModeToggle);

    // Should now be unchecked
    expect(focusModeToggle).toHaveAttribute("aria-checked", "false");
  });

  it("starts on specified defaultTab", () => {
    render(<SettingsDialog {...defaultProps} defaultTab="appearance" />);

    expect(
      screen.getByRole("heading", { name: "Appearance", level: 1 }),
    ).toBeInTheDocument();
  });

  it("calls onLogout when Log Out is clicked", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(<SettingsDialog {...defaultProps} onLogout={onLogout} />);

    await user.click(screen.getByRole("button", { name: "Log Out" }));

    expect(onLogout).toHaveBeenCalled();
  });

  it("shows close button and closes on click", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<SettingsDialog {...defaultProps} onOpenChange={onOpenChange} />);

    // Find the close button (has sr-only "Close" text)
    const closeButton = screen.getByRole("button", { name: "Close" });

    await user.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("SettingsDialog - General Page", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    defaultTab: "general" as const,
    initialSettings: {
      general: defaultGeneralSettings,
      appearance: defaultAppearanceSettings,
      export: defaultExportSettings,
    },
  };

  it("displays all Writing Experience toggles", () => {
    render(<SettingsDialog {...defaultProps} />);

    expect(screen.getByText("Focus Mode")).toBeInTheDocument();
    expect(screen.getByText("Typewriter Scroll")).toBeInTheDocument();
    expect(screen.getByText("Smart Punctuation")).toBeInTheDocument();
  });

  it("displays Data & Storage section", () => {
    render(<SettingsDialog {...defaultProps} />);

    expect(screen.getByText("Data & Storage")).toBeInTheDocument();
    expect(screen.getByText("Local Auto-Save")).toBeInTheDocument();
    expect(screen.getByText("Backup Interval")).toBeInTheDocument();
    expect(screen.getByText("Last backup: 2 minutes ago")).toBeInTheDocument();
  });

  it("displays Editor Defaults section", () => {
    render(<SettingsDialog {...defaultProps} />);

    expect(screen.getByText("Editor Defaults")).toBeInTheDocument();
    expect(screen.getByText("Default Typography")).toBeInTheDocument();
    expect(screen.getByText("Interface Scale")).toBeInTheDocument();
  });
});

describe("SettingsDialog - Account Page", () => {
  it("shows Upgrade button for free users", async () => {
    const user = userEvent.setup();
    const onUpgrade = vi.fn();
    render(
      <SettingsDialog
        open={true}
        onOpenChange={vi.fn()}
        defaultTab="account"
        account={{
          name: "Free User",
          email: "free@example.com",
          plan: "free",
        }}
        onUpgrade={onUpgrade}
      />,
    );

    const upgradeButton = screen.getByRole("button", { name: "Upgrade to Pro" });
    expect(upgradeButton).toBeInTheDocument();

    await user.click(upgradeButton);
    expect(onUpgrade).toHaveBeenCalled();
  });

  it("shows Manage Subscription button for pro users", () => {
    render(
      <SettingsDialog
        open={true}
        onOpenChange={vi.fn()}
        defaultTab="account"
        account={{
          name: "Pro User",
          email: "pro@example.com",
          plan: "pro",
        }}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Manage Subscription" }),
    ).toBeInTheDocument();
  });

  it("shows Delete Account button in danger zone", () => {
    render(
      <SettingsDialog
        open={true}
        onOpenChange={vi.fn()}
        defaultTab="account"
        account={{
          name: "Test User",
          email: "test@example.com",
          plan: "pro",
        }}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Delete Account" }),
    ).toBeInTheDocument();
  });
});
