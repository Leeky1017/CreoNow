import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DeleteProjectDialog } from "./DeleteProjectDialog";

describe("DeleteProjectDialog confirmation", () => {
  it("should enable delete only when typed project name matches exactly", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <DeleteProjectDialog
        open
        projectName="测试项目"
        documentCount={3}
        onConfirm={onConfirm}
        onOpenChange={vi.fn()}
      />,
    );

    const confirmButton = screen.getByTestId("delete-project-confirm-button");
    const nameInput = screen.getByTestId("delete-project-name-input");

    expect(confirmButton).toBeDisabled();

    await user.type(nameInput, "测试");
    expect(confirmButton).toBeDisabled();

    await user.clear(nameInput);
    await user.type(nameInput, "测试项目");
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("should keep delete disabled and skip ipc request on mismatch", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <DeleteProjectDialog
        open
        projectName="测试项目"
        documentCount={3}
        onConfirm={onConfirm}
        onOpenChange={vi.fn()}
      />,
    );

    const confirmButton = screen.getByTestId("delete-project-confirm-button");
    const nameInput = screen.getByTestId("delete-project-name-input");

    await user.type(nameInput, "测试项");
    expect(confirmButton).toBeDisabled();

    await user.click(confirmButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
