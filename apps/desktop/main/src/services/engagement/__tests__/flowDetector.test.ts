/**
 * flowDetector unit tests — 心流状态检测器
 *
 * 28 tests covering:
 *   - Core state machine: initial, sporadic (gap > 15s), light/deep flow
 *   - Window events: blur breaks flow, focus alone doesn't restore
 *   - Timing: exit timeout, duration accuracy, gap boundary (>= maxGap)
 *   - Config: custom thresholds, keystroke buffer pruning
 *   - Edge cases: monotonic timestamps, future keystrokes, blur-before-input,
 *     blur boundary on latest keystroke, exact maxGap boundary
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

  it("does not trigger flow for sporadic keystrokes (gap > maxKeystrokeGap)", () => {
    const fd = createFlowDetector();
    const baseTime = 1_000_000;

    // Keystrokes 20s apart — each gap exceeds the 15s max
    fd.recordKeystroke(baseTime);
    fd.recordKeystroke(baseTime + 20 * SEC);
    fd.recordKeystroke(baseTime + 40 * SEC);
    fd.recordKeystroke(baseTime + 60 * SEC);
    fd.recordKeystroke(baseTime + 80 * SEC);
    fd.recordKeystroke(baseTime + 100 * SEC);
    fd.recordKeystroke(baseTime + 120 * SEC);
    fd.recordKeystroke(baseTime + 140 * SEC);
    fd.recordKeystroke(baseTime + 160 * SEC);
    fd.recordKeystroke(baseTime + 180 * SEC);

    // Total span: 180s > 5 min threshold? No (only 3 min), but point is
    // no continuous chain — each keystroke is isolated
    const state = fd.getFlowState(baseTime + 180 * SEC);
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
    // Continuous chain is only 2s (from 6s to 8s), not 8s
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
    // With activeChainStart tracking, duration is the true continuous time
    // even though the keystroke buffer itself is pruned.
    expect(state.duration).toBe(9_999);
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

      // Type for 3 minutes, pause 10s (< 15s maxGap), type for 3 more minutes
      const firstRunEnd = simulateTyping(fd, base, 3 * MIN);
      const resumeStart = firstRunEnd + 10 * SEC;
      const secondRunEnd = simulateTyping(fd, resumeStart, 3 * MIN);

      // Total continuous duration > 6 min → light flow
      const state = fd.getFlowState(secondRunEnd);
      expect(state.isInFlow).toBe(true);
      expect(state.intensity).toBe("light");
    });

    it("breaks flow when gap equals maxKeystrokeGap exactly", () => {
      const fd = createFlowDetector({
        lightFlowThresholdMs: 100,
        deepFlowThresholdMs: 200,
        maxKeystrokeGapMs: 50,
        flowExitTimeoutMs: 80,
      });
      const base = 10_000;

      // Two keystrokes with gap == maxGap (50ms)
      // Spec: "停顿 < 15 秒" → gap >= maxGap breaks chain
      fd.recordKeystroke(base);
      fd.recordKeystroke(base + 50);

      // Chain is broken: second keystroke starts a new chain of length 0
      const state = fd.getFlowState(base + 50);
      expect(state.isInFlow).toBe(false);
    });

    it("maintains flow when gap is one less than maxKeystrokeGap", () => {
      const fd = createFlowDetector({
        lightFlowThresholdMs: 100,
        deepFlowThresholdMs: 200,
        maxKeystrokeGapMs: 50,
        flowExitTimeoutMs: 80,
      });
      const base = 10_000;

      // Build chain: base, base+49, base+98 (gaps of 49ms < 50ms maxGap)
      fd.recordKeystroke(base);
      fd.recordKeystroke(base + 49);
      fd.recordKeystroke(base + 98);
      fd.recordKeystroke(base + 147);

      // Duration = 147ms > lightThreshold (100ms)
      const state = fd.getFlowState(base + 147);
      expect(state.isInFlow).toBe(true);
      expect(state.duration).toBe(147);
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
    it("maxGap (15s) breaks continuous chain before exitTimeout (60s)", () => {
      const fd = createFlowDetector();
      const base = 1_000_000;

      // Establish flow
      const lastKeystroke = simulateTyping(fd, base, 6 * MIN);
      expect(fd.getFlowState(lastKeystroke).isInFlow).toBe(true);

      // 20s later (> 15s maxGap but < 60s exitTimeout)
      // Continuous chain is broken, but haven't hit exit timeout
      const state = fd.getFlowState(lastKeystroke + 20 * SEC);
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

  // ── audit-driven edge cases ───────────────────────────────────────

  describe("blur before any keystrokes", () => {
    it("does not corrupt state when blur fires before any input", () => {
      const fd = createFlowDetector({
        lightFlowThresholdMs: 100,
        maxKeystrokeGapMs: 50,
      });

      // Blur with no prior keystrokes → lastBlurTime = 0
      fd.recordWindowBlur();
      fd.recordWindowFocus();

      // Type starting from timestamp 1 (after blur sentinel)
      for (let t = 1; t <= 200; t += 10) {
        fd.recordKeystroke(t);
      }

      const state = fd.getFlowState(200);
      expect(state.isInFlow).toBe(true);
      expect(state.intensity).toBe("light");
    });
  });

  describe("monotonic timestamp enforcement", () => {
    it("ignores out-of-order timestamps", () => {
      const fd = createFlowDetector({
        lightFlowThresholdMs: 50,
        maxKeystrokeGapMs: 100,
      });
      const base = 1000;

      // Normal sequence
      fd.recordKeystroke(base);
      fd.recordKeystroke(base + 20);
      fd.recordKeystroke(base + 40);

      // Out-of-order: should be silently ignored
      fd.recordKeystroke(base + 10);
      fd.recordKeystroke(base + 30);

      // Continue normally
      fd.recordKeystroke(base + 60);

      // Duration should be 60ms (base to base+60), not corrupted
      const state = fd.getFlowState(base + 60);
      expect(state.isInFlow).toBe(true);
      expect(state.duration).toBe(60);
    });

    it("ignores duplicate timestamps", () => {
      const fd = createFlowDetector({
        lightFlowThresholdMs: 50,
        maxKeystrokeGapMs: 100,
      });

      fd.recordKeystroke(1000);
      fd.recordKeystroke(1000); // duplicate — ignored
      fd.recordKeystroke(1060);

      const state = fd.getFlowState(1060);
      expect(state.isInFlow).toBe(true);
      expect(state.duration).toBe(60);
    });
  });

  describe("future keystroke filtering", () => {
    it("ignores keystrokes recorded after the query time", () => {
      const fd = createFlowDetector({
        lightFlowThresholdMs: 50,
        maxKeystrokeGapMs: 100,
      });

      // Record keystrokes at 100, 200, 300
      fd.recordKeystroke(100);
      fd.recordKeystroke(200);
      fd.recordKeystroke(300);

      // Query at time 150 — keystroke at 200 and 300 are "future"
      // Only keystroke at 100 is valid, duration = 150 - 100 = 50
      const state = fd.getFlowState(150);
      expect(state.isInFlow).toBe(true);
      expect(state.duration).toBe(50);

      // Query at time 50 — all keystrokes are "future"
      const earlyState = fd.getFlowState(50);
      expect(earlyState.isInFlow).toBe(false);
    });
  });

  describe("blur boundary on latest keystroke", () => {
    it("does not detect flow from pre-blur keystrokes after focus", () => {
      const fd = createFlowDetector({
        lightFlowThresholdMs: 0,
        maxKeystrokeGapMs: 60_000,
      });

      // Single keystroke, then blur, then focus
      fd.recordKeystroke(1000);
      fd.recordWindowBlur();    // lastBlurTime = 1000
      fd.recordWindowFocus();

      // Query slightly after — the pre-blur keystroke should NOT count
      const state = fd.getFlowState(1001);
      expect(state.isInFlow).toBe(false);
    });

    it("detects flow only from post-blur keystrokes", () => {
      const fd = createFlowDetector({
        lightFlowThresholdMs: 0,
        maxKeystrokeGapMs: 60_000,
      });

      // Keystroke, blur, focus, new keystroke
      fd.recordKeystroke(1000);
      fd.recordWindowBlur();    // lastBlurTime = 1000
      fd.recordWindowFocus();
      fd.recordKeystroke(2000); // post-blur

      const state = fd.getFlowState(2000);
      expect(state.isInFlow).toBe(true);
      // Duration should be from the post-blur keystroke only
      expect(state.duration).toBe(0);
    });
  });

  // ── R3 regression tests ───────────────────────────────────────────

  describe("duration accuracy beyond retention window", () => {
    it("reports full duration even when buffer is pruned", () => {
      // Duck R3 finding: pruning discards old keystrokes, causing duration
      // to be capped at maxRetentionMs instead of the true continuous time.
      const fd = createFlowDetector({
        lightFlowThresholdMs: 100,
        deepFlowThresholdMs: 500,
        maxKeystrokeGapMs: 200,
        flowExitTimeoutMs: 300,
        // maxRetentionMs = 500 + 300 = 800
      });

      // Type continuously from 0 to 1500 (well beyond 800 retention)
      for (let t = 0; t <= 1500; t += 50) {
        fd.recordKeystroke(t);
      }

      const state = fd.getFlowState(1500);
      expect(state.isInFlow).toBe(true);
      expect(state.intensity).toBe("deep");
      // Duration must be the FULL 1500ms, not capped at 800 retention
      expect(state.duration).toBe(1500);
    });
  });

  describe("blur sentinel does not collide with timestamp 0", () => {
    it("allows post-blur keystrokes starting at timestamp 0", () => {
      const fd = createFlowDetector({
        lightFlowThresholdMs: 50,
        maxKeystrokeGapMs: 100,
      });

      // Blur before any keystrokes → sentinel should not block ts=0
      fd.recordWindowBlur();
      fd.recordWindowFocus();

      // Type starting at timestamp 0
      fd.recordKeystroke(0);
      fd.recordKeystroke(10);
      fd.recordKeystroke(20);
      fd.recordKeystroke(60);

      const state = fd.getFlowState(60);
      expect(state.isInFlow).toBe(true);
      expect(state.duration).toBe(60);
    });
  });

  describe("activeChainStart reset on blur", () => {
    it("resets chain start after blur even for long sessions", () => {
      const fd = createFlowDetector({
        lightFlowThresholdMs: 100,
        deepFlowThresholdMs: 500,
        maxKeystrokeGapMs: 200,
        flowExitTimeoutMs: 300,
      });

      // Long continuous session
      for (let t = 0; t <= 1000; t += 50) {
        fd.recordKeystroke(t);
      }
      expect(fd.getFlowState(1000).duration).toBe(1000);

      // Blur breaks the chain
      fd.recordWindowBlur();
      fd.recordWindowFocus();

      // New chain starts fresh
      fd.recordKeystroke(1100);
      fd.recordKeystroke(1200);
      fd.recordKeystroke(1300);

      const state = fd.getFlowState(1300);
      expect(state.isInFlow).toBe(true);
      // Duration from new chain start (1100), not from old chain (0)
      expect(state.duration).toBe(200);
    });
  });
});
