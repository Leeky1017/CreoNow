import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { DashboardPage } from "./DashboardPage";
import {
  ProjectStoreProvider,
  createProjectStore,
} from "../../stores/projectStore";

// Mock ipcClient
vi.mock("../../lib/ipcClient", () => ({
  invoke: vi.fn().mockResolvedValue({ ok: true, data: {} }),
}));

function createProjectsInvoke() {
  return vi.fn().mockImplementation((channel: string) => {
    if (channel === "project:project:list") {
      return Promise.resolve({
        ok: true,
        data: {
          items: [
            {
              projectId: "proj-1",
              name: "Test Project",
              genreLabel: "Novel",
              wordCount: 1000,
              documentCount: 3,
              archived: false,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-02-28T12:00:00Z",
            },
          ],
        },
      });
    }
    if (channel === "project:project:getcurrent") {
      return Promise.resolve({
        ok: false,
        error: { code: "NOT_FOUND", message: "No current project" },
      });
    }
    return Promise.resolve({ ok: true, data: {} });
  });
}

describe("Dashboard ghost button guard (PM-FE-DASH-S3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // PM-FE-DASH-S3: No clickable elements without handlers
  it("has no buttons or anchors without event handlers", async () => {
    const storeInvoke = createProjectsInvoke();
    const projectStore = createProjectStore({ invoke: storeInvoke });

    const { container } = render(
      <ProjectStoreProvider store={projectStore}>
        <DashboardPage />
      </ProjectStoreProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
    });

    // Gather all <button> and <a> elements
    const buttons = container.querySelectorAll("button");
    const anchors = container.querySelectorAll("a");

    // Every button must either:
    // - have an onClick/onPointerDown/onMouseDown handler (React sets these via internal props)
    // - or be inside an element that handles clicks (e.g. DropdownMenuTrigger)
    // - or have type="submit" (form buttons)
    //
    // Since we can't easily inspect React event handlers from the DOM,
    // we'll check that no <button> lacks both an onclick attribute AND a data-testid or aria-label.
    // Ghost buttons are typically bare <button> with no testid, no aria, no role context.
    const ghostButtons: string[] = [];

    buttons.forEach((btn) => {
      const hasTestId = btn.hasAttribute("data-testid");
      const hasAriaLabel = btn.hasAttribute("aria-label");
      const hasTitle = btn.hasAttribute("title");
      const hasType = btn.getAttribute("type") === "submit";
      const parentRole = btn.closest("[role]");
      const parentDataState = btn.closest("[data-state]");

      // If button has no identifying attribute or role context, it may be a ghost
      if (
        !hasTestId &&
        !hasAriaLabel &&
        !hasTitle &&
        !hasType &&
        !parentRole &&
        !parentDataState
      ) {
        ghostButtons.push(
          btn.textContent?.trim() || btn.outerHTML.slice(0, 100),
        );
      }
    });

    expect(ghostButtons).toEqual([]);

    // Anchors must have href
    anchors.forEach((a) => {
      expect(a.hasAttribute("href")).toBe(true);
    });
  });
});
