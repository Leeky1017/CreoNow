import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import type { IpcError } from "../../../../../../packages/shared/types/ipc-generated";
import { ExportDialog } from "./ExportDialog";

describe("ExportDialog", () => {
  it("renders config view with Markdown selected by default", () => {
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        projectId="test-project"
        documentTitle="Test Document"
      />,
    );

    expect(screen.getByTestId("export-dialog")).toBeInTheDocument();
    expect(screen.getByText("Export Document")).toBeInTheDocument();
    expect(screen.getByText("Test Document")).toBeInTheDocument();

    expect(screen.getByTestId("export-format-markdown")).toHaveAttribute(
      "data-state",
      "checked",
    );
    expect(screen.getByText("MARKDOWN • A4")).toBeInTheDocument();
  });

  it("enables all export formats (pdf/docx/txt/markdown)", () => {
    render(
      <ExportDialog open={true} onOpenChange={() => {}} projectId="test" />,
    );

    expect(screen.getByTestId("export-format-pdf")).not.toBeDisabled();
    expect(screen.getByTestId("export-format-docx")).not.toBeDisabled();
    expect(screen.getByTestId("export-format-txt")).not.toBeDisabled();
    expect(screen.getByTestId("export-format-markdown")).not.toBeDisabled();
  });

  it("disables Export when projectId is missing", () => {
    render(<ExportDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByTestId("export-submit")).toBeDisabled();
    expect(screen.getByText(/NO_PROJECT:/)).toBeInTheDocument();
  });

  it("renders controlled progress view", () => {
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        projectId="test"
        view="progress"
        progress={42}
        progressStep="Exporting..."
      />,
    );

    // "Exporting Document" appears twice: sr-only title + visible heading
    expect(screen.getAllByText("Exporting Document")).toHaveLength(2);
    expect(screen.getByText("Exporting...")).toBeInTheDocument();
  });

  it("renders controlled success view with result fields", () => {
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        projectId="test"
        view="success"
        result={{ relativePath: "exports/test/doc.md", bytesWritten: 99 }}
      />,
    );

    expect(screen.getByTestId("export-success")).toBeInTheDocument();
    expect(screen.getByTestId("export-success-relative-path")).toHaveTextContent(
      "exports/test/doc.md",
    );
    expect(screen.getByTestId("export-success-bytes-written")).toHaveTextContent(
      "99",
    );
  });

  it("renders error banner in config view when error is provided", () => {
    const error: IpcError = { code: "IO_ERROR", message: "failed" };

    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        projectId="test"
        error={error}
      />,
    );

    expect(screen.getByTestId("export-error")).toBeInTheDocument();
    expect(screen.getByTestId("export-error-code")).toHaveTextContent(
      "IO_ERROR",
    );
    expect(screen.getByTestId("export-error-message")).toHaveTextContent(
      "failed",
    );
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });
});

