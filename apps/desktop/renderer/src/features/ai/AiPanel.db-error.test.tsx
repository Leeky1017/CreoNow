import { describe, expect, it } from "vitest";

import { formatDbErrorDescription } from "./AiPanel";

describe("formatDbErrorDescription", () => {
  it("should include rebuild command and restart guidance when remediation exists", () => {
    // Arrange
    const args = {
      message: "Database native module ABI mismatch.",
      details: {
        category: "native_module_abi_mismatch",
        remediation: {
          command: "pnpm -C apps/desktop rebuild:native",
          restartRequired: true,
        },
      },
    };

    // Act
    const text = formatDbErrorDescription(args);

    // Assert
    expect(text).toContain("rebuild:native");
    expect(text).toContain("restart the app");
  });

  it("should fallback to original message when details are missing", () => {
    // Arrange
    const args = {
      message: "Database not ready",
      details: undefined,
    };

    // Act
    const text = formatDbErrorDescription(args);

    // Assert
    expect(text).toBe("Database not ready");
  });
});
