/**
 * Hello-world smoke test.
 *
 * Verifies that the Vitest pipeline is functional:
 * - Test discovery works
 * - Assertions execute
 * - Test helpers are importable
 *
 * This file can be removed once real module specs produce real tests.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  useFakeTimer,
  advanceDays,
  daysAgo,
  createMockLlmClient,
  FIXED_RESPONSES,
} from "../../../tests/helpers";

describe("Test Infrastructure Smoke Test", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should run a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("should use fake timer helpers correctly", () => {
    // Arrange
    useFakeTimer(new Date("2025-06-01T00:00:00Z"));

    // Act
    const thirtyDaysAgo = daysAgo(30);

    // Assert
    expect(thirtyDaysAgo.getTime()).toBe(
      new Date("2025-05-02T00:00:00Z").getTime(),
    );
  });

  it("should advance fake timer by days", () => {
    // Arrange
    useFakeTimer(new Date("2025-01-01T00:00:00Z"));
    const before = Date.now();

    // Act
    advanceDays(7);
    const after = Date.now();

    // Assert
    expect(after - before).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("should create mock LLM client that returns deterministic response", async () => {
    // Arrange
    const llm = createMockLlmClient();

    // Act
    const result = await llm.complete("test prompt");

    // Assert
    expect(result.text).toBe(FIXED_RESPONSES.continuation);
    expect(result.tokens).toBeGreaterThan(0);
    expect(llm.callCount()).toBe(1);
    expect(llm.lastPrompt()).toBe("test prompt");
  });

  it("should support custom LLM mock response", async () => {
    // Arrange
    const llm = createMockLlmClient("Custom AI response");

    // Act
    const result = await llm.complete("another prompt");

    // Assert
    expect(result.text).toBe("Custom AI response");
  });

  it("should reset mock LLM client state", async () => {
    // Arrange
    const llm = createMockLlmClient();
    await llm.complete("first call");

    // Act
    llm.reset();

    // Assert
    expect(llm.callCount()).toBe(0);
    expect(llm.lastPrompt()).toBeNull();
  });
});
