import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import * as ErrorBoundaryModule from "./ErrorBoundary";

function CrashyComponent(): JSX.Element {
  throw new Error("boom-render");
}

describe("ErrorBoundary", () => {
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
    // suppress react error boundary noise in test output
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  it("renders fallback when child throws during render", () => {
    render(
      <ErrorBoundaryModule.ErrorBoundary>
        <CrashyComponent />
      </ErrorBoundaryModule.ErrorBoundary>,
    );

    expect(screen.getByTestId("app-error-boundary")).toBeInTheDocument();
    expect(screen.getByText("App crashed")).toBeInTheDocument();
    expect(screen.getByTestId("app-error-details")).toHaveTextContent(
      "boom-render",
    );
  });

  it("reload button triggers window reload", async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();

    render(
      <ErrorBoundaryModule.ErrorBoundary onReload={onReload}>
        <CrashyComponent />
      </ErrorBoundaryModule.ErrorBoundary>,
    );

    await user.click(screen.getByRole("button", { name: "Reload App" }));

    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("copy button writes error details to clipboard", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <ErrorBoundaryModule.ErrorBoundary>
        <CrashyComponent />
      </ErrorBoundaryModule.ErrorBoundary>,
    );

    await user.click(screen.getByRole("button", { name: "Copy error details" }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("app-error-copy-status")).toHaveTextContent(
      "Error details copied.",
    );
  });
});
