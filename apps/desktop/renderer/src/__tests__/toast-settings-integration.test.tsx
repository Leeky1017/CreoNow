import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AppToastProvider } from "../components/providers/AppToastProvider";
import {
  SettingsDialog,
} from "../features/settings-dialog/SettingsDialog";

vi.mock("../stores/versionPreferencesStore", () => ({
  useVersionPreferencesStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ showAiMarks: false, setShowAiMarks: vi.fn() }),
  ),
}));

/**
 * 测试：设置保存场景 Toast 集成
 *
 * AC-7: 设置保存成功后出现 success Toast
 */
describe("toast-settings integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("设置变更后触发 success Toast (AC-7)", async () => {
    const user = userEvent.setup();

    render(
      <AppToastProvider>
        <SettingsDialog
          open
          onOpenChange={() => {}}
          defaultTab="general"
        />
      </AppToastProvider>,
    );

    // Find a toggle in settings and click it to change a setting
    const toggles = screen.getAllByRole("switch");
    if (toggles.length > 0) {
      await act(async () => {
        await user.click(toggles[0]);
      });

      expect(screen.getByText("Settings saved")).toBeInTheDocument();
    }
  });
});
