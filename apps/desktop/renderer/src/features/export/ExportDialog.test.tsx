import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExportDialog, defaultExportOptions } from "./ExportDialog";

describe("ExportDialog", () => {
  // ===========================================================================
  // Rendering tests
  // ===========================================================================

  it("renders config view by default when open", () => {
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        documentTitle="Test Document"
      />
    );

    expect(screen.getByText("Export Document")).toBeInTheDocument();
    expect(screen.getByText("Test Document")).toBeInTheDocument();
    expect(screen.getByText("Format")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <ExportDialog
        open={false}
        onOpenChange={() => {}}
        documentTitle="Test Document"
      />
    );

    expect(screen.queryByText("Export Document")).not.toBeInTheDocument();
  });

  it("renders all format options", () => {
    render(<ExportDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("Markdown")).toBeInTheDocument();
    expect(screen.getByText("Word")).toBeInTheDocument();
    expect(screen.getByText("Plain Text")).toBeInTheDocument();
  });

  it("renders all settings options", () => {
    render(<ExportDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("Include metadata")).toBeInTheDocument();
    expect(screen.getByText("Version history")).toBeInTheDocument();
    expect(screen.getByText("Embed images")).toBeInTheDocument();
  });

  it("renders page size select", () => {
    render(<ExportDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("Page Size")).toBeInTheDocument();
  });

  it("renders preview section", () => {
    render(<ExportDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("PDF • A4")).toBeInTheDocument();
  });

  it("renders estimated size", () => {
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        estimatedSize="~2.4 MB"
      />
    );

    expect(screen.getByText("~2.4 MB")).toBeInTheDocument();
  });

  it("renders export and cancel buttons", () => {
    render(<ExportDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  // ===========================================================================
  // Format selection tests
  // ===========================================================================

  it("has PDF selected by default", () => {
    render(<ExportDialog open={true} onOpenChange={() => {}} />);

    const pdfCard = screen.getByText("PDF").closest("button");
    expect(pdfCard).toHaveAttribute("data-state", "checked");
  });

  it("updates preview when format changes", () => {
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        initialOptions={{ ...defaultExportOptions, format: "markdown" }}
      />
    );

    expect(screen.getByText("MARKDOWN • A4")).toBeInTheDocument();
  });

  it("shows description for format options", () => {
    render(<ExportDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("Portable Document")).toBeInTheDocument();
    expect(screen.getByText(".md")).toBeInTheDocument();
    expect(screen.getByText(".docx")).toBeInTheDocument();
    expect(screen.getByText(".txt")).toBeInTheDocument();
  });

  // ===========================================================================
  // Page size tests
  // ===========================================================================

  it("shows different page size in preview", () => {
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        initialOptions={{ ...defaultExportOptions, pageSize: "letter" }}
      />
    );

    expect(screen.getByText("PDF • LETTER")).toBeInTheDocument();
  });

  // ===========================================================================
  // Controlled view tests
  // ===========================================================================

  it("renders progress view when view='progress'", () => {
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        view="progress"
        progress={45}
        progressStep="Generating pages..."
        documentTitle="Test Document"
      />
    );

    // Use getAllByText because the title appears in both sr-only and visible heading
    expect(screen.getAllByText("Exporting Document").length).toBeGreaterThan(0);
    expect(screen.getByText("45%")).toBeInTheDocument();
    expect(screen.getByText("Generating pages...")).toBeInTheDocument();
  });

  it("renders success view when view='success'", () => {
    render(
      <ExportDialog open={true} onOpenChange={() => {}} view="success" />
    );

    // Use getAllByText because the title appears in both sr-only and visible heading
    expect(screen.getAllByText("Export Complete").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Your file has been successfully downloaded.").length
    ).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });

  it("shows document title in progress view", () => {
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        view="progress"
        progress={50}
        documentTitle="The Architecture of Silence"
      />
    );

    expect(
      screen.getByText(/Converting .+The Architecture of Silence.+ to PDF/)
    ).toBeInTheDocument();
  });

  // ===========================================================================
  // Callback tests
  // ===========================================================================

  it("calls onOpenChange when close button is clicked", () => {
    const onOpenChange = vi.fn();
    render(<ExportDialog open={true} onOpenChange={onOpenChange} />);

    const closeButton = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onCancel when cancel button is clicked in config view", () => {
    const onCancel = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ExportDialog
        open={true}
        onOpenChange={onOpenChange}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onOpenChange(false) when Done button is clicked in success view", () => {
    const onOpenChange = vi.fn();
    render(
      <ExportDialog
        open={true}
        onOpenChange={onOpenChange}
        view="success"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ===========================================================================
  // Accessibility tests
  // ===========================================================================

  it("has accessible title", () => {
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        documentTitle="Test Document"
      />
    );

    expect(
      screen.getByRole("heading", { name: "Export Document" })
    ).toBeInTheDocument();
  });

  it("has cancel button with cancel label in progress view", () => {
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        view="progress"
        progress={50}
      />
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  // ===========================================================================
  // Default values tests
  // ===========================================================================

  it("uses default options when none provided", () => {
    render(<ExportDialog open={true} onOpenChange={() => {}} />);

    // PDF should be selected
    const pdfCard = screen.getByText("PDF").closest("button");
    expect(pdfCard).toHaveAttribute("data-state", "checked");

    // Preview should show PDF • A4
    expect(screen.getByText("PDF • A4")).toBeInTheDocument();
  });

  it("applies initial options correctly", () => {
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        initialOptions={{
          format: "word",
          pageSize: "legal",
          includeMetadata: false,
          versionHistory: true,
          embedImages: false,
        }}
      />
    );

    // Word should be selected
    const wordCard = screen.getByText("Word").closest("button");
    expect(wordCard).toHaveAttribute("data-state", "checked");

    // Preview should show WORD • LEGAL
    expect(screen.getByText("WORD • LEGAL")).toBeInTheDocument();
  });

  // ===========================================================================
  // Progress step tests
  // ===========================================================================

  it("shows correct progress percentage", () => {
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        view="progress"
        progress={75}
      />
    );

    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("shows provided progress step", () => {
    render(
      <ExportDialog
        open={true}
        onOpenChange={() => {}}
        view="progress"
        progress={85}
        progressStep="Embedding images..."
      />
    );

    expect(screen.getByText("Embedding images...")).toBeInTheDocument();
  });
});
