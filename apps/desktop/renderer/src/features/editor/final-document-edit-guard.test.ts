import { describe, expect, it } from "vitest";

import { resolveFinalDocumentEditDecision } from "./finalDocumentEditGuard";

describe("resolveFinalDocumentEditDecision", () => {
  it("should switch final document back to draft when user confirms", () => {
    const res = resolveFinalDocumentEditDecision({
      status: "final",
      confirmed: true,
    });

    expect(res.nextStatus).toBe("draft");
    expect(res.allowEditing).toBe(true);
  });

  it("should keep final status when user cancels", () => {
    const res = resolveFinalDocumentEditDecision({
      status: "final",
      confirmed: false,
    });

    expect(res.nextStatus).toBe("final");
    expect(res.allowEditing).toBe(false);
  });
});
