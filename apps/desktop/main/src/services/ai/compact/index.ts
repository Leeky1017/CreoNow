/**
 * @module compact
 * ## Responsibilities: narrative-aware context compression (INV-5).
 *    Compresses low-priority context fragments to stay within token budget
 *    while preserving KG entities, character settings, foreshadowing,
 *    world rules, and user-marked content.
 * ## Does not do: original document modification, bare LLM calls,
 *    conversation history compression (see compressionEngine.ts).
 * ## Dependency direction: Skill system (INV-6), CostTracker (INV-9),
 *    shared/tokenBudget (INV-3).
 * ## Invariants: INV-3, INV-5, INV-6, INV-9.
 */

export {
  createNarrativeCompactService,
  BUILTIN_AUTO_COMPACT_SKILL_ID,
  type NarrativeCompactService,
  type NarrativeCompactConfig,
  type ContextFragment,
  type CompactedFragment,
  type CompactedContext,
  type FragmentPriority,
  type SkillInvoker,
} from "./narrativeCompact";
