/**
 * @module flowDetector
 * ## Responsibilities: Detect whether the user is in a writing flow state based
 *    on keystroke timing and window focus events. Emits a pure read-only
 *    {@link FlowState} snapshot — no side effects, no DB, no LLM.
 * ## Does not do: UI mutation, IPC, event emission, persistence, delete-rate
 *    analysis (planned — see engagement-engine.md §机制8 STUCK / COOLING states).
 * ## Dependency direction: None — zero imports. Pure computation.
 * ## Invariants: P-E (engagement constraint — getFlowState ≤ 200ms).
 * ## Performance: O(1) amortized for getFlowState(); keystroke buffer bounded
 *    to `deepFlowThresholdMs + flowExitTimeoutMs` window to cap memory.
 */

// ─── types ──────────────────────────────────────────────────────────

export interface FlowState {
  readonly isInFlow: boolean;
  /** Milliseconds since continuous flow started. 0 when not in flow. */
  readonly duration: number;
  readonly intensity: "light" | "deep" | "none";
}

export interface FlowDetector {
  /** Record a keystroke event. Call from editor keydown handler. */
  recordKeystroke(timestamp?: number): void;
  /** Record window losing focus. Breaks flow immediately. */
  recordWindowBlur(): void;
  /** Record window regaining focus. Does NOT restore flow — need keystrokes. */
  recordWindowFocus(): void;
  /**
   * Get current flow state. O(1) amortized — must be < 200ms.
   * @param now - Injectable timestamp for deterministic testing (INV P4).
   */
  getFlowState(now?: number): FlowState;
  /** Reset all state (for testing or project switch). */
  reset(): void;
}

export interface FlowDetectorConfig {
  /** Continuous typing duration to enter light flow. Default: 5 min. */
  lightFlowThresholdMs?: number;
  /** Continuous typing duration to enter deep flow. Default: 15 min. */
  deepFlowThresholdMs?: number;
  /**
   * Max gap between keystrokes to still count as "continuous typing".
   * Default: 30s.
   * @why 30s is generous for creative writing — authors pause to think
   * between sentences. Shorter gaps (e.g. 5s) would miss legitimate flow.
   * Csíkszentmihályi's research shows writers maintain flow state across
   * inter-sentence pauses of up to ~20-30s.
   */
  maxKeystrokeGapMs?: number;
  /**
   * Silence duration that exits flow entirely and resets state.
   * Default: 60s.
   * @why 60s timeout: engagement-engine.md spec. A full minute without
   * input means the user has context-switched or walked away.
   */
  flowExitTimeoutMs?: number;
}

// ─── constants ──────────────────────────────────────────────────────

const DEFAULT_LIGHT_FLOW_MS = 5 * 60 * 1000; // 5 min — Csíkszentmihályi conservative median (engagement-engine.md)
const DEFAULT_DEEP_FLOW_MS = 15 * 60 * 1000; // 15 min — sustained creative session
const DEFAULT_MAX_GAP_MS = 30_000; // 30s — inter-sentence creative pause ceiling
const DEFAULT_EXIT_TIMEOUT_MS = 60_000; // 60s — full context-switch threshold

const NO_FLOW: FlowState = Object.freeze({
  isInFlow: false,
  duration: 0,
  intensity: "none" as const,
});

// ─── factory ────────────────────────────────────────────────────────

export function createFlowDetector(config?: FlowDetectorConfig): FlowDetector {
  const lightThreshold =
    config?.lightFlowThresholdMs ?? DEFAULT_LIGHT_FLOW_MS;
  const deepThreshold =
    config?.deepFlowThresholdMs ?? DEFAULT_DEEP_FLOW_MS;
  const maxGap = config?.maxKeystrokeGapMs ?? DEFAULT_MAX_GAP_MS;
  const exitTimeout = config?.flowExitTimeoutMs ?? DEFAULT_EXIT_TIMEOUT_MS;

  /**
   * Bounded circular buffer of keystroke timestamps.
   * @why Array + pruning rather than linked list: better cache locality for
   * the small-N case (typical: a few hundred entries per deep-flow window).
   * Pruning happens lazily inside recordKeystroke to amortize cost.
   */
  let keystrokes: number[] = [];

  /** true when the window is focused. Blur breaks flow. */
  let windowFocused = true;

  /**
   * Timestamp of the most recent window blur event. Keystrokes before this
   * time are not part of the current continuous chain — blur is a hard break.
   * null means no blur has occurred (or state was reset).
   */
  let lastBlurTime: number | null = null;

  /**
   * Maximum retention window — keystrokes older than this are irrelevant.
   * Set to deepThreshold + exitTimeout to handle the longest possible
   * lookback needed for state computation.
   */
  const maxRetentionMs = deepThreshold + exitTimeout;

  // ── internal helpers ──────────────────────────────────────────────

  /**
   * Remove keystrokes older than the retention window.
   * @why Prevents unbounded memory growth during long sessions.
   * Uses binary-search-like forward scan since keystrokes are sorted.
   */
  function pruneOldKeystrokes(now: number): void {
    const cutoff = now - maxRetentionMs;
    // Fast path: nothing to prune
    if (keystrokes.length === 0 || keystrokes[0] >= cutoff) {
      return;
    }
    // Find first index >= cutoff via linear scan.
    // @why Linear scan, not binary search: for typical keystroke rates
    // (2-8 keys/sec over 15 min ≈ 1800-7200 entries) the pruned prefix
    // is usually small, making splice cheaper than binary search overhead.
    let i = 0;
    while (i < keystrokes.length && keystrokes[i] < cutoff) {
      i++;
    }
    if (i > 0) {
      keystrokes = keystrokes.slice(i);
    }
  }

  /**
   * Compute the start of continuous typing — walk backwards from the most
   * recent keystroke and find the earliest point where all consecutive gaps
   * are ≤ maxGap AND the keystroke is after the last blur event.
   *
   * Returns the timestamp of the first keystroke in the continuous run,
   * or null if there are no keystrokes or the latest keystroke is stale.
   */
  function computeContinuousStart(now: number): number | null {
    if (keystrokes.length === 0) {
      return null;
    }

    const latest = keystrokes[keystrokes.length - 1];

    // If the latest keystroke is too old, no active run.
    if (now - latest > maxGap) {
      return null;
    }

    // Walk backwards to find the chain of continuous keystrokes.
    // Stop at any gap > maxGap OR any keystroke at/before the last blur.
    let continuousStart = latest;
    for (let i = keystrokes.length - 2; i >= 0; i--) {
      const gap = keystrokes[i + 1] - keystrokes[i];
      if (gap > maxGap) {
        break;
      }
      // Don't walk past a blur boundary — blur is a hard chain break.
      if (lastBlurTime !== null && keystrokes[i] <= lastBlurTime) {
        break;
      }
      continuousStart = keystrokes[i];
    }
    return continuousStart;
  }

  // ── public API ────────────────────────────────────────────────────

  function recordKeystroke(timestamp?: number): void {
    const ts = timestamp ?? Date.now();

    keystrokes.push(ts);
    pruneOldKeystrokes(ts);
  }

  function recordWindowBlur(): void {
    windowFocused = false;
    // Use the most recent keystroke as the chain-break marker.
    // This keeps the marker in the same time domain as injected timestamps
    // (INV P4 — deterministic testing), rather than using Date.now().
    lastBlurTime =
      keystrokes.length > 0
        ? keystrokes[keystrokes.length - 1]
        : 0;
  }

  function recordWindowFocus(): void {
    windowFocused = true;
    // Focus alone does NOT restore flow — user must resume typing.
  }

  function getFlowState(now?: number): FlowState {
    const currentTime = now ?? Date.now();

    // No keystrokes recorded yet.
    if (keystrokes.length === 0) {
      return NO_FLOW;
    }

    // Window not focused → no flow.
    if (!windowFocused) {
      return NO_FLOW;
    }

    const latest = keystrokes[keystrokes.length - 1];

    // Exit timeout: > exitTimeout since last keystroke → reset.
    if (currentTime - latest > exitTimeout) {
      return NO_FLOW;
    }

    // If gap since last keystroke exceeds maxGap, continuous run is broken.
    if (currentTime - latest > maxGap) {
      return NO_FLOW;
    }

    // Recompute continuous start every call — keystroke buffer is bounded,
    // so this backward scan is O(n) where n ≤ maxRetentionMs / typical_interval.
    const continuousStart = computeContinuousStart(currentTime);

    if (continuousStart === null) {
      return NO_FLOW;
    }

    const duration = currentTime - continuousStart;

    if (duration >= deepThreshold) {
      return { isInFlow: true, duration, intensity: "deep" };
    }
    if (duration >= lightThreshold) {
      return { isInFlow: true, duration, intensity: "light" };
    }

    // Typing continuously but haven't hit light threshold yet.
    return NO_FLOW;
  }

  function reset(): void {
    keystrokes = [];
    windowFocused = true;
    lastBlurTime = null;
  }

  return {
    recordKeystroke,
    recordWindowBlur,
    recordWindowFocus,
    getFlowState,
    reset,
  };
}
