/**
 * @module flowDetector
 * ## Responsibilities: Detect whether the user is in a writing flow state based
 *    on keystroke timing and window focus events. Emits a pure read-only
 *    {@link FlowState} snapshot — no side effects, no DB, no LLM.
 * ## Scope: Preliminary light/deep flow primitive. Implements the IN_FLOW
 *    detection from engagement-engine.md §机制8 (5min light, 15min deep,
 *    gap < 15s per spec). The full 5-state machine (IDLE / WARMING_UP /
 *    IN_FLOW / STUCK / COOLING) and delete-rate analysis are planned as
 *    a follow-up — see engagement-engine.md §机制8 for the target spec.
 * ## Does not do: UI mutation, IPC, event emission, persistence, delete-rate
 *    analysis, STUCK / COOLING state detection.
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
   *   Controls keystroke filtering only: keystrokes after `now` are ignored.
   *   Blur/focus state is always evaluated as-is (not time-traveled), because
   *   window events have no injectable timestamp in production.
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
   * A gap strictly less than this value is continuous; a gap equal to or
   * greater than this value breaks the chain.
   * Default: 15s.
   * @why engagement-engine.md §机制8 defines IN_FLOW as "停顿 < 15 秒".
   * Gaps >= 15s break the continuous chain. The spec separately defines
   * STUCK_PAUSE = 30s for the STUCK state (not yet implemented).
   */
  maxKeystrokeGapMs?: number;
  /**
   * Silence duration that exits flow entirely and resets state.
   * Default: 60s.
   * @why 2× the spec's STUCK_PAUSE (30s). A full minute without input
   * means the user has context-switched or walked away. The spec does not
   * define an explicit exit/reset threshold — this is a conservative
   * heuristic for the simplified 2-state model (flow / no-flow).
   */
  flowExitTimeoutMs?: number;
}

// ─── constants ──────────────────────────────────────────────────────

const DEFAULT_LIGHT_FLOW_MS = 5 * 60 * 1000; // 5 min — Csíkszentmihályi conservative median (engagement-engine.md)
const DEFAULT_DEEP_FLOW_MS = 15 * 60 * 1000; // 15 min — sustained creative session
const DEFAULT_MAX_GAP_MS = 15_000; // 15s — engagement-engine.md §机制8 IN_FLOW: "停顿 < 15 秒"
const DEFAULT_EXIT_TIMEOUT_MS = 60_000; // 60s — 2× STUCK_PAUSE, conservative context-switch heuristic

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
   * Start timestamp of the current continuous keystroke chain.
   * Maintained incrementally in recordKeystroke so that duration remains
   * accurate even after the keystroke buffer is pruned.
   * null when no active chain exists (initial state, post-blur, post-reset).
   */
  let activeChainStart: number | null = null;

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
   * Compute the start of continuous typing — walk backwards from the
   * effective latest keystroke (at `latestIdx`) and find the earliest
   * point where all consecutive gaps are < maxGap AND the keystroke is
   * after the last blur event.
   *
   * Returns the timestamp of the first keystroke in the continuous run,
   * or null if there are no valid keystrokes or the chain is empty.
   */
  function computeContinuousStart(
    now: number,
    latestIdx: number,
  ): number | null {
    if (latestIdx < 0) {
      return null;
    }

    const latest = keystrokes[latestIdx];

    // If the latest keystroke is too old, no active run.
    // @why `>=` not `>`: spec says IN_FLOW requires "停顿 < 15 秒",
    // so a gap of exactly maxGap is NOT continuous.
    if (now - latest >= maxGap) {
      return null;
    }

    // Latest keystroke must be after blur boundary to start a chain.
    // @why Without this check, a single keystroke recorded before blur
    // could be treated as the start of a post-blur chain, violating the
    // documented contract: "focus alone does NOT restore flow."
    if (lastBlurTime !== null && latest <= lastBlurTime) {
      return null;
    }

    // Walk backwards to find the chain of continuous keystrokes.
    // Stop at any gap >= maxGap OR any keystroke at/before the last blur.
    let continuousStart = latest;
    for (let i = latestIdx - 1; i >= 0; i--) {
      const gap = keystrokes[i + 1] - keystrokes[i];
      if (gap >= maxGap) {
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
    // Ignore keystrokes when window is not focused — blur is a hard break.
    // @why Stray/racing key events arriving after blur must not extend
    // or start a chain that would report flow after the next focus.
    if (!windowFocused) {
      return;
    }

    const ts = timestamp ?? Date.now();

    // Enforce monotonic timestamps — ignore out-of-order or duplicate events.
    // @why Sorted invariant is required by pruneOldKeystrokes (prefix trim)
    // and computeContinuousStart (backward gap scan). Real keystrokes from
    // Date.now() are monotonic; this guard protects against injected test
    // timestamps or clock drift.
    if (keystrokes.length > 0 && ts <= keystrokes[keystrokes.length - 1]) {
      return;
    }

    // Maintain activeChainStart — tracks the true start of the current
    // continuous chain so that duration stays accurate after buffer pruning.
    if (keystrokes.length === 0) {
      activeChainStart = ts;
    } else {
      const lastTs = keystrokes[keystrokes.length - 1];
      const gapTooLarge = ts - lastTs >= maxGap;
      const lastPreBlur = lastBlurTime !== null && lastTs <= lastBlurTime;
      if (gapTooLarge || lastPreBlur) {
        activeChainStart = ts;
      }
      // else: chain continues — keep existing activeChainStart
    }

    keystrokes.push(ts);
    pruneOldKeystrokes(ts);
  }

  function recordWindowBlur(): void {
    windowFocused = false;
    activeChainStart = null;
    // Use the most recent keystroke as the chain-break marker.
    // This keeps the marker in the same time domain as injected timestamps
    // (INV P4 — deterministic testing), rather than using Date.now().
    // @why -1 (not 0) when no keystrokes: avoids collision with a valid
    // first post-blur keystroke at timestamp 0 in deterministic tests.
    lastBlurTime =
      keystrokes.length > 0
        ? keystrokes[keystrokes.length - 1]
        : -1;
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

    // Find the latest keystroke that is <= currentTime.
    // @why Callers may query a past point in time (e.g. deterministic tests).
    // Keystrokes recorded after `now` must not influence the result.
    let effectiveLatestIdx = keystrokes.length - 1;
    while (effectiveLatestIdx >= 0 && keystrokes[effectiveLatestIdx] > currentTime) {
      effectiveLatestIdx--;
    }
    if (effectiveLatestIdx < 0) {
      return NO_FLOW;
    }

    const latest = keystrokes[effectiveLatestIdx];

    // Exit timeout: >= exitTimeout since last keystroke → no flow.
    // @why `>=` for consistency with maxGap boundary semantics.
    if (currentTime - latest >= exitTimeout) {
      return NO_FLOW;
    }

    // If gap since last keystroke reaches maxGap, continuous run is broken.
    // @why `>=` not `>`: spec "停顿 < 15 秒" → gap of exactly 15s is NOT continuous.
    if (currentTime - latest >= maxGap) {
      return NO_FLOW;
    }

    // Determine duration — use tracked activeChainStart for present-time
    // queries (accurate beyond retention window), fall back to buffer-bounded
    // backward scan for past-time queries where future filtering occurred.
    const futureFiltered = effectiveLatestIdx < keystrokes.length - 1;
    let duration: number;

    if (!futureFiltered && activeChainStart !== null) {
      duration = currentTime - activeChainStart;
    } else {
      const continuousStart = computeContinuousStart(currentTime, effectiveLatestIdx);
      if (continuousStart === null) {
        return NO_FLOW;
      }
      duration = currentTime - continuousStart;
    }

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
    activeChainStart = null;
  }

  return {
    recordKeystroke,
    recordWindowBlur,
    recordWindowFocus,
    getFlowState,
    reset,
  };
}
