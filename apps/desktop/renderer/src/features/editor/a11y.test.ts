import { describe, expect, it } from "vitest";

import { createToggleButtonA11yProps } from "./a11y";

describe("createToggleButtonA11yProps", () => {
  it("should return aria-label and aria-pressed fields", () => {
    expect(
      createToggleButtonA11yProps({ label: "Bold", pressed: true }),
    ).toEqual({
      "aria-label": "Bold",
      "aria-pressed": true,
    });
  });

  it("should default pressed state to false", () => {
    expect(createToggleButtonA11yProps({ label: "Italic" })).toEqual({
      "aria-label": "Italic",
      "aria-pressed": false,
    });
  });
});
