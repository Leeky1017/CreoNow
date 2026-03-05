import assert from "node:assert/strict";

import {
  calculateDecayScore,
  classifyDecayLevel,
  resolveImplicitFeedback,
  assembleMemoryLayers,
  IMPLICIT_SIGNAL_WEIGHTS,
} from "../episodicMemoryHelpers";
import type {
  WorkingMemoryLayerItem,
  EpisodeRecord,
  SemanticMemoryRulePlaceholder,
} from "../episodicMemoryService";

// ── IMPLICIT_SIGNAL_WEIGHTS sanity ──────────────────────────────

{
  assert.equal(IMPLICIT_SIGNAL_WEIGHTS.DIRECT_ACCEPT, 1);
  assert.equal(IMPLICIT_SIGNAL_WEIGHTS.UNDO_AFTER_ACCEPT, -1);
  assert.equal(IMPLICIT_SIGNAL_WEIGHTS.FULL_REJECT, -0.8);
}

// ── S1: calculateDecayScore — fresh episode ─────────────────────

{
  const score = calculateDecayScore({
    ageInDays: 0,
    recallCount: 0,
    importance: 0,
  });
  // exp(0) * 1 * 1 = 1
  assert.equal(score, 1);
}

// ── S2: calculateDecayScore — old episode fully decayed ─────────

{
  const score = calculateDecayScore({
    ageInDays: 30,
    recallCount: 0,
    importance: 0,
  });
  // exp(-3) ≈ 0.0498
  assert.ok(score < 0.1, `expected score < 0.1, got ${score}`);
  assert.ok(score > 0, "score must be positive");
}

// ── S3: calculateDecayScore — old with high recall & importance ─

{
  const scoreBarren = calculateDecayScore({
    ageInDays: 30,
    recallCount: 0,
    importance: 0,
  });
  const scoreBoosted = calculateDecayScore({
    ageInDays: 30,
    recallCount: 10,
    importance: 1,
  });
  // boosted = exp(-3) * (1 + 2) * (1 + 0.3) = exp(-3) * 3.9 ≈ 0.194
  assert.ok(
    scoreBoosted > scoreBarren * 3,
    `boosted (${scoreBoosted}) should be much larger than barren (${scoreBarren})`,
  );
}

// ── S4: calculateDecayScore — negative & out-of-range clamping ──

{
  const scoreNegAge = calculateDecayScore({
    ageInDays: -5,
    recallCount: 0,
    importance: 0,
  });
  // age clamped to 0 → same as fresh
  assert.equal(scoreNegAge, 1);

  const scoreHighImp = calculateDecayScore({
    ageInDays: 0,
    recallCount: 0,
    importance: 2,
  });
  // importance clamped to 1 → exp(0) * 1 * 1.3 = min(1, 1.3) = 1
  assert.equal(scoreHighImp, 1);
}

// ── S5: classifyDecayLevel — active ─────────────────────────────

{
  assert.equal(classifyDecayLevel(0.8), "active");
  assert.equal(classifyDecayLevel(0.7), "active");
  assert.equal(classifyDecayLevel(1.0), "active");
}

// ── S6: classifyDecayLevel — decaying ───────────────────────────

{
  assert.equal(classifyDecayLevel(0.5), "decaying");
  assert.equal(classifyDecayLevel(0.3), "decaying");
  assert.equal(classifyDecayLevel(0.69), "decaying");
}

// ── S7: classifyDecayLevel — to_compress ────────────────────────

{
  assert.equal(classifyDecayLevel(0.15), "to_compress");
  assert.equal(classifyDecayLevel(0.1), "to_compress");
  assert.equal(classifyDecayLevel(0.29), "to_compress");
}

// ── S8: classifyDecayLevel — to_evict ───────────────────────────

{
  assert.equal(classifyDecayLevel(0.05), "to_evict");
  assert.equal(classifyDecayLevel(0.0), "to_evict");
  assert.equal(classifyDecayLevel(0.09), "to_evict");
}

// ── S9: resolveImplicitFeedback — undo after accept ─────────────

{
  const result = resolveImplicitFeedback({
    selectedIndex: 0,
    candidateCount: 3,
    editDistance: 0,
    undoAfterAccept: true,
  });
  assert.equal(result.signal, "UNDO_AFTER_ACCEPT");
  assert.equal(result.weight, -1);
}

// ── S10: resolveImplicitFeedback — full reject ──────────────────

{
  const result = resolveImplicitFeedback({
    selectedIndex: -1,
    candidateCount: 3,
    editDistance: 0,
  });
  assert.equal(result.signal, "FULL_REJECT");
  assert.equal(result.weight, -0.8);
}

// ── S11: resolveImplicitFeedback — direct accept ────────────────

{
  const result = resolveImplicitFeedback({
    selectedIndex: 0,
    candidateCount: 3,
    editDistance: 0,
  });
  assert.equal(result.signal, "DIRECT_ACCEPT");
  assert.equal(result.weight, 1);
}

// ── S12: resolveImplicitFeedback — light edit ───────────────────

{
  const result = resolveImplicitFeedback({
    selectedIndex: 0,
    candidateCount: 3,
    editDistance: 0.1,
  });
  assert.equal(result.signal, "LIGHT_EDIT");
  assert.equal(result.weight, 0.45);
}

// ── S13: resolveImplicitFeedback — heavy rewrite ────────────────

{
  const result = resolveImplicitFeedback({
    selectedIndex: 0,
    candidateCount: 3,
    editDistance: 0.8,
  });
  assert.equal(result.signal, "HEAVY_REWRITE");
  assert.equal(result.weight, -0.45);
}

// ── S14: assembleMemoryLayers — structure assembly ──────────────

{
  const working = [
    { id: "w1", content: "ctx" },
  ] as unknown as WorkingMemoryLayerItem[];
  const episodes = [{ id: "e1" }] as unknown as EpisodeRecord[];
  const rules = [
    { id: "r1", rule: "short sentences" },
  ] as unknown as SemanticMemoryRulePlaceholder[];

  const result = assembleMemoryLayers({
    projectId: "proj-1",
    sessionId: "sess-1",
    working,
    episodes,
    semanticRules: rules,
    memoryDegraded: true,
    fallbackRules: ["rule-a"],
  });

  assert.equal(result.immediate.projectId, "proj-1");
  assert.equal(result.immediate.sessionId, "sess-1");
  assert.equal(result.immediate.items.length, 1);
  assert.equal(result.episodic.items.length, 1);
  assert.equal(result.settings.rules.length, 1);
  assert.equal(result.settings.memoryDegraded, true);
  assert.deepEqual(result.settings.fallbackRules, ["rule-a"]);

  // arrays are copies, not references
  assert.notEqual(result.immediate.items, working);
  assert.notEqual(result.episodic.items, episodes);
  assert.notEqual(result.settings.rules, rules);
}

console.log("episodicMemoryHelpers.test.ts: all assertions passed");
