import { describe, expect, it, vi } from "vitest";

import { dispatchEditorSkillShortcut } from "./skillShortcutDispatcher";

describe("dispatchEditorSkillShortcut", () => {
  it("S2-SC-1 should trigger continue executor on Ctrl+Enter", () => {
    const executors = {
      continueWriting: vi.fn(),
      polish: vi.fn(),
    };

    const result = dispatchEditorSkillShortcut(
      {
        key: "Enter",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
      },
      executors,
    );

    expect(result.matched).toBe(true);
    expect(result.action).toBe("continueWriting");
    expect(executors.continueWriting).toHaveBeenCalledTimes(1);
    expect(executors.polish).not.toHaveBeenCalled();
  });

  it("S2-SC-2 should trigger polish executor on Ctrl+Shift+R", () => {
    const executors = {
      continueWriting: vi.fn(),
      polish: vi.fn(),
    };

    const result = dispatchEditorSkillShortcut(
      {
        key: "R",
        ctrlKey: true,
        metaKey: false,
        shiftKey: true,
      },
      executors,
    );

    expect(result.matched).toBe(true);
    expect(result.action).toBe("polish");
    expect(executors.polish).toHaveBeenCalledTimes(1);
    expect(executors.continueWriting).not.toHaveBeenCalled();
  });

  it("S2-SC-3 should keep no-op when key combo is not mapped", () => {
    const executors = {
      continueWriting: vi.fn(),
      polish: vi.fn(),
    };

    const result = dispatchEditorSkillShortcut(
      {
        key: "K",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
      },
      executors,
    );

    expect(result.matched).toBe(false);
    expect(result.action).toBeNull();
    expect(executors.continueWriting).not.toHaveBeenCalled();
    expect(executors.polish).not.toHaveBeenCalled();
  });
});
