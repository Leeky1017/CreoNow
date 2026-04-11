/**
 * @module ai/compact
 * ## Responsibilities: export narrative-aware compaction services for writing pipeline integration.
 * ## Does not do: orchestrator wiring or request lifecycle ownership.
 * ## Dependency direction: ai/compact -> ai/modelConfig + shared token estimation.
 * ## Invariants: INV-5, INV-10.
 */

export {
  createCompactConfig,
  resolveContextBudgetFromModelConfig,
  type CompactConfig,
  type CompactConfigOverrides,
} from "./compactConfig";
export {
  createAutoCompact,
  estimateConversationTokens,
  type AutoCompactResult,
  type AutoCompactService,
} from "./autoCompact";
export {
  createNarrativeCompact,
  type CompactMessage,
  type NarrativeKnowledgeSnapshot,
  type NarrativeCompactDeps,
  type NarrativeCompactRequest,
  type NarrativeCompactResult,
  type SkillSummaryInvocation,
  type SkillSummaryResult,
} from "./narrativeCompact";
