import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { InlineDiffControls } from "./InlineDiffControls";

describe("InlineDiffControls", () => {
  it("S2-ID-1 should render inline add/remove decorations with accept/reject controls", () => {
    render(
      <InlineDiffControls
        originalText="before line"
        suggestedText="after line"
        onApplyAcceptedText={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId("inline-diff-decoration-layer"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("inline-diff-remove-0-0")).toHaveTextContent(
      "before line",
    );
    expect(screen.getByTestId("inline-diff-add-0-0")).toHaveTextContent(
      "after line",
    );
    expect(screen.getByTestId("inline-diff-controls-0")).toBeInTheDocument();
    expect(screen.getByTestId("inline-diff-accept-0")).toBeInTheDocument();
    expect(screen.getByTestId("inline-diff-reject-0")).toBeInTheDocument();
  });

  it("S2-ID-2 should apply accepted hunk text and remove controls for resolved hunk", async () => {
    const onApplyAcceptedText = vi.fn();
    const user = userEvent.setup();

    render(
      <InlineDiffControls
        originalText="before line"
        suggestedText="after line"
        onApplyAcceptedText={onApplyAcceptedText}
      />,
    );

    await user.click(screen.getByTestId("inline-diff-accept-0"));

    expect(onApplyAcceptedText).toHaveBeenCalledTimes(1);
    expect(onApplyAcceptedText).toHaveBeenCalledWith("after line");
    expect(
      screen.queryByTestId("inline-diff-controls-0"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("inline-diff-current-text")).toHaveTextContent(
      "after line",
    );
  });

  it("S2-ID-3 should keep original text when rejecting hunk", async () => {
    const onApplyAcceptedText = vi.fn();
    const user = userEvent.setup();

    render(
      <InlineDiffControls
        originalText="before line"
        suggestedText="after line"
        onApplyAcceptedText={onApplyAcceptedText}
      />,
    );

    await user.click(screen.getByTestId("inline-diff-reject-0"));

    expect(onApplyAcceptedText).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId("inline-diff-controls-0"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("inline-diff-current-text")).toHaveTextContent(
      "before line",
    );
  });
});
