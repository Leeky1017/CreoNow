/**
 * flowDetector unit tests — 心流状态检测器
 *
 * Coverage targets (13 cases):
 *   1.  Initial state is no-flow
 *   2.  Sporadic keystrokes (gap > 30s) don't trigger flow
 *   3.  5 min continuous typing → light flow
 *   4.  15 min continuous typing → deep flow
 *   5.  Window blur breaks flow immediately
 *   6.  Window focus alone doesn't restore flow (need keystrokes)
 *   7.  60s timeout exits flow
 *   8.  Flow duration is calculated correctly
 *   9.  Reset clears all state
 *   10. Custom config thresholds work
 *   11. Edge: exactly at threshold boundary
 *   12. Edge: rapid-fire keystrokes (stress test)
 *   13. Memory: keystroke buffer doesn't grow unbounded
 */

import { describe, it, expect } from "vitest";

import {
  createFlowDetector,
  type FlowDetector,
} from "../flowDetector";

// ─── helpers ────────────────────────────────────────────────────────

const SEC = 1_000;
const MIN = 60 * SEC;

/**
 * Simulate continuous typing from `start` to `start + durationMs`,
 * with one keystroke every `intervalMs` milliseconds.
 */
function simulateTyping(
  fd: FlowDetector,
  start: number,
  durationMs: number,
  intervalMs: number = 1_000,
): number {
  let t = start;
  while (t <= start + durationMs) {
    fd.recordKeystroke(t);
    t += intervalMs;
  }
  // Return the timestamp just after the last keystroke
  return t - intervalMs;
}

// ─── tests ──────────────────────────────────────────────────────────

describe("flowDetector", () => {
  // ── 1. Initial state ──────────────────────────────────────────────

  it("returns no-flow as initial state", () => {
    const fd = createFlowDetector();
    const state = fd.getFlowState(0);
    expect(state).toEqual({
      isInFlow: false,
      duration: 0,
      intensity: "none",
    });
  });

  // ── 2. Sporadic keystrokes ────────────────────────────────────────

  it("does not trigger flow for sporadic keystrokes (gap > 30s)", () => {
    const fd = createFlowDetector();
    const baseTime = 1_000_000;

    // Keystrokes 35s apart — each gap exceeds the 30s max
    fd.recordKeystroke(baseTime);
    fd.recordKeystroke(baseTime + 35 * SEC);
    fd.recordKeystroke(baseTime + 70 * SEC);
    fd.recordKeystroke(baseTime + 105 * SEC);
    fd.recordKeystroke(baseTime + 140 * SEC);
    fd.recordKeystroke(baseTime + 175 * SEC);
    fd.recordKeystroke(baseTime + 210 * SEC);
    fd.recordKeystroke(baseTime + 245 * SEC);
    fd.recordKeystroke(baseTime + 280 * SEC);
    fd.recordKeystroke(baseTime + 315 * SEC);

    // Total span: 315s > 5 min, but no continuous chain
    const state = fd.getFlowState(baseTime + 315 * SEC);
    expect(state.isInFlow).toBe(false);
    expect(state.intensity).toBe("none");
  });

  // ── 3. Light flow at 5 minutes ────────────────────────────────────

  it("detects light flow after 5 minutes of continuous typing", () => {
    const fd = createFlowDetector();
    const baseTime = 1_000_000;

    // Type continuously for 5 minutes (1 keystroke/sec)
    const lastKeystroke = simulateTyping(fd, baseTime, 5 * MIN);

    const state = fd.getFlowState(lastKeystroke);
    expect(state.isInFlow).toBe(true);
    expect(state.intensity).toBe("light");
  });

  // ── 4. Deep flow at 15 minutes ────────────────────────────────────

  it("detects deep flow after 15 minutes of continuous typing", () => {
    const fd = createFlowDetector();
    const baseTime = 1_000_000;

    // Type continuously for 15 minutes
    const lastKeystroke = simulateTyping(fd, baseTime, 15 * MIN);

    const state = fd.getFlowState(lastKeystroke);
    expect(state.isInFlow).toBe(true);
    expect(state.intensity).toBe("deep");
  });

  // ── 5. Window blur breaks flow ────────────────────────────────────

  it("breaks flow immediately on window blur", () => {
    const fd = createFlowDetector();
    const baseTime = 1_000_000;

    // Establish light flow
    const lastKeystroke = simulateTyping(fd, baseTime, 6 * MIN);
    expect(fd.getFlowState(lastKeystroke).isInFlow).toBe(true);

    // Blur window
    fd.recordWindowBlur();

    const state = fd.getFlowState(lastKeystroke);
    expect(state.isInFlow).toBe(false);
    expect(state.intensity).toBe("none");
  });

  // ── 6. Focus alone doesn't restore flow ───────────────────────────

  it("does not restore flow on window focus alone (needs keystrokes)", () => {
    const fd = createFlowDetector();
    const baseTime = 1_000_000;

    // Establish light flow, blur, focus
    const lastKeystroke = simulateTyping(fd, baseTime, 6 * MIN);
    fd.recordWindowBlur();
    fd.recordWindowFocus();

    // Still no flow — user hasn't typed since focus
    const state = fd.getFlowState(lastKeystroke + 1 * SEC);
    expect(state.isInFlow).toBe(false);

    // Must type again for 5 minutes to re-enter flow
    const resumeStart = lastKeystroke + 2 * SEC;
    const resumeEnd = simulateTyping(fd, resumeStart, 5 * MIN);

    const restored = fd.getFlowState(resumeEnd);
    expect(restored.isInFlow).toBe(true);
    expect(restored.intensity).toBe("light");
  });

  // ── 7. 60s timeout exits flow ─────────────────────────────────────

  it("exits flow after 60s without input", () => {
    const fd = createFlowDetector();
    const baseTime = 1_000_000;

    // Establish flow
    const lastKeystroke = simulateTyping(fd, baseTime, 6 * MIN);
    expect(fd.getFlowState(lastKeystroke).isInFlow).toBe(true);

    // 61 seconds later — exceeds exit timeout
    const state = fd.getFlowState(lastKeystroke + 61 * SEC);
    expect(state.isInFlow).toBe(false);
    expect(state.intensity).toBe("none");
  });

  // ── 8. Flow duration is calculated correctly ──────────────────────

  it("calculates flow duration correctly", () => {
    const fd = createFlowDetector();
    const baseTime = 1_000_000;

    // Type for exactly 7 minutes
    const lastKeystroke = simulateTyping(fd, baseTime, 7 * MIN);

    const state = fd.getFlowState(lastKeystroke);
    expect(state.isInFlow).toBe(true);
    expect(state.intensity).toBe("light");
    // Duration should be ~7 minutes from first keystroke
    expect(state.duration).toBe(lastKeystroke - baseTime);
  });

  // ── 9. Reset clears all state ─────────────────────────────────────

  it("clears all state on reset", () => {
    const fd = createFlowDetector();
    const baseTime = 1_000_000;

    // Establish flow
    simulateTyping(fd, baseTime, 6 * MIN);

    fd.reset();

    const state = fd.getFlowState(baseTime + 6 * MIN + 1);
    expect(state).toEqual({
      isInFlow: false,
      duration: 0,
      intensity: "none",
    });

    // Can re-enter flow from scratch after reset
    const newStart = baseTime + 10 * MIN;
    const newEnd = simulateTyping(fd, newStart, 5 * MIN);
    expect(fd.getFlowState(newEnd).isInFlow).toBe(true);
  });

  // ── 10. Custom config thresholds ──────────────────────────────────

  it("respects custom configuration thresholds", () => {
    const fd = createFlowDetector({
      lightFlowThresholdMs: 10 * SEC,   // 10s for light
      deepFlowThresholdMs: 30 * SEC,    // 30s for deep
      maxKeystrokeGapMs: 5 * SEC,       // 5s max gap
      flowExitTimeoutMs: 15 * SEC,      // 15s exit timeout
    });
    const baseTime = 1_000_000;

    // Type for 11 seconds (1 keystroke/sec) → should be light flow
    const afterLight = simulateTyping(fd, baseTime, 11 * SEC);
    expect(fd.getFlowState(afterLight).intensity).toBe("light");

    // Continue to 31 seconds → should be deep flow
    const afterDeep = simulateTyping(fd, afterLight + SEC, 20 * SEC);
    expect(fd.getFlowState(afterDeep).intensity).toBe("deep");

    // Gap > 5s custom maxGap breaks continuous chain
    fd.reset();
    fd.recordKeystroke(baseTime);
    fd.recordKeystroke(baseTime + 6 * SEC); // 6s gap > 5s max
    fd.recordKeystroke(baseTime + 7 * SEC);
    fd.recordKeystroke(baseTime + 8 * SEC);
    // Continuous chain is only 3s (from 6s to 8s), not 8s
    expect(fd.getFlowState(baseTime + 8 * SEC).isInFlow).toBe(false);
  });

  // ── 11. Edge: exactly at threshold boundary ───────────────────────

  it("handles threshold boundaries precisely", () => {
    const fd = createFlowDetector({
      lightFlowThresholdMs: 100,
      deepFlowThresholdMs: 200,
      maxKeystrokeGapMs: 50,
      flowExitTimeoutMs: 80,
    });
    const base = 10_000;

    // Keystrokes every 10ms for 100ms → exactly light threshold
    for (let t = base; t <= base + 100; t += 10) {
      fd.recordKeystroke(t);
    }

    // At exactly 100ms duration: should be light
    const atLight = fd.getFlowState(base + 100);
    expect(atLight.isInFlow).toBe(true);
    expect(atLight.intensity).toBe("light");

    // One ms before light threshold
    fd.reset();
    for (let t = base; t <= base + 99; t += 10) {
      fd.recordKeystroke(t);
    }
    const beforeLight = fd.getFlowState(base + 99);
    expect(beforeLight.isInFlow).toBe(false);

    // Exactly at deep threshold
    fd.reset();
    for (let t = base; t <= base + 200; t += 10) {
      fd.recordKeystroke(t);
    }
    const atDeep = fd.getFlowState(base + 200);
    expect(atDeep.isInFlow).toBe(true);
    expect(atDeep.intensity).toBe("deep");
  });

  // ── 12. Edge: rapid-fire keystrokes (stress test) ─────────────────

  it("handles rapid-fire keystrokes without error", () => {
    const fd = createFlowDetector({
      lightFlowThresholdMs: 500,
      deepFlowThresholdMs: 1000,
      maxKeystrokeGapMs: 100,
      flowExitTimeoutMs: 200,
    });
    const base = 0;

    // 10,000 keystrokes at 1ms intervals (simulating held key)
    for (let i = 0; i < 10_000; i++) {
      fd.recordKeystroke(base + i);
    }

    const state = fd.getFlowState(base + 9_999);
    expect(state.isInFlow).toBe(true);
    expect(state.intensity).toBe("deep");
    // Duration is capped by the retention window (deepThreshold + exitTimeout
    // = 1000 + 200 = 1200ms) because pruning removes older entries.
    // This proves the buffer is bounded while flow detection stays correct.
    expect(state.duration).toBeLessThanOrEqual(1200);
    expect(state.duration).toBeGreaterThanOrEqual(1000); // still >= deep threshold
  });

  // ── 13. Memory: keystroke buffer doesn't grow unbounded ───────────

  it("prunes keystroke buffer to prevent unbounded memory growth", () => {
    const fd = createFlowDetector({
      lightFlowThresholdMs: 100,
      deepFlowThresholdMs: 200,
      maxKeystrokeGapMs: 50,
      flowExitTimeoutMs: 80,
    });

    // Max retention = deepThreshold + exitTimeout = 200 + 80 = 280ms
    const base = 0;

    // Record 1000 keystrokes spanning 1000ms (1 per ms)
    for (let i = 0; i < 1000; i++) {
      fd.recordKeystroke(base + i);
    }

    // The buffer should only retain entries within the retention window.
    // We can't access internal state directly, but we can verify behavior:
    // After a long run, the state is still correct (buffer was pruned,
    // not corrupted), and flow detection still works.
    const state = fd.getFlowState(base + 999);
    expect(state.isInFlow).toBe(true);
    expect(state.intensity).toBe("deep");

    // Reset and verify a clean start
    fd.reset();
    expect(fd.getFlowState(base + 1000).isInFlow).toBe(false);
  });

  // ── additional edge cases ─────────────────────────────────────────

  describe("gap handling", () => {
    it("maintains flow through gaps shorter than maxKeystrokeGap", () => {
      const fd = createFlowDetector();
      const base = 1_000_000;

      // Type for 3 minutes, pause 25s (< 30s), type for 3 more minutes
      const firstRunEnd = simulateTyping(fd, base, 3 * MIN);
      const resumeStart = firstRunEnd + 25 * SEC;
      const secondRunEnd = simulateTyping(fd, resumeStart, 3 * MIN);

      // Total continuous duration > 6 min → light flow
      const state = fd.getFlowState(secondRunEnd);
      expect(state.isInFlow).toBe(true);
      expect(state.intensity).toBe("light");
    });

    it("breaks flow on gap exactly at maxKeystrokeGap boundary", () => {
      const fd = createFlowDetector({
        lightFlowThresholdMs: 100,
        deepFlowThresholdMs: 200,
        maxKeystrokeGapMs: 50,
        flowExitTimeoutMs: 80,
      });
      const base = 10_000;

      // Two keystrokes with exactly maxGap+1 apart (51ms > 50ms)
      fd.recordKeystroke(base);
      fd.recordKeystroke(base + 51);

      // Continuous chain is only 0ms (single keystroke at base+51)
      // which is < lightThreshold (100ms)
      const state = fd.getFlowState(base + 51);
      expect(state.isInFlow).toBe(false);
    });
  });

  describe("transition from light to deep", () => {
    it("transitions from light to deep as typing continues", () => {
      const fd = createFlowDetector();
      const base = 1_000_000;

      // At 5 min → light
      const at5min = simulateTyping(fd, base, 5 * MIN);
      expect(fd.getFlowState(at5min).intensity).toBe("light");

      // Continue to 15 min → deep
      const at15min = simulateTyping(fd, at5min + SEC, 10 * MIN);
      expect(fd.getFlowState(at15min).intensity).toBe("deep");
    });
  });

  describe("exit timeout vs maxGap interaction", () => {
    it("maxGap (30s) breaks continuous chain before exitTimeout (60s)", () => {
      const fd = createFlowDetector();
      const base = 1_000_000;

      // Establish flow
      const lastKeystroke = simulateTyping(fd, base, 6 * MIN);
      expect(fd.getFlowState(lastKeystroke).isInFlow).toBe(true);

      // 35s later (> 30s maxGap but < 60s exitTimeout)
      // Continuous chain is broken, but haven't hit exit timeout
      const state = fd.getFlowState(lastKeystroke + 35 * SEC);
      expect(state.isInFlow).toBe(false);
    });
  });

  describe("recordKeystroke default timestamp", () => {
    it("uses Date.now() when no timestamp provided", () => {
      const fd = createFlowDetector({
        lightFlowThresholdMs: 0, // Immediate light flow
        maxKeystrokeGapMs: 60_000,
      });

      fd.recordKeystroke(); // Uses Date.now()
      const state = fd.getFlowState(); // Uses Date.now()
      // Should be in flow since lightThreshold is 0
      expect(state.isInFlow).toBe(true);
    });
  });
});
