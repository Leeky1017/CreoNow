import { describe, expect, it, vi } from "vitest";

import { applyBootstrapStatus } from "@/features/workbench/bootstrapStatus";

describe("applyBootstrapStatus", () => {
  it("updates the ref before publishing state so same-tick callbacks see ready immediately", () => {
    const bootstrapStatusRef = { current: "loading" } as const;
    const seenRefValues: string[] = [];
    const setBootstrapStatus = vi.fn((nextStatus: "loading" | "ready" | "error") => {
      seenRefValues.push(bootstrapStatusRef.current);
      expect(nextStatus).toBe("ready");
    });

    applyBootstrapStatus("ready", bootstrapStatusRef as { current: "loading" | "ready" | "error" }, setBootstrapStatus);

    expect(seenRefValues).toEqual(["ready"]);
    expect(bootstrapStatusRef.current).toBe("ready");
  });
});
