import type {
  DecayLevel,
  EpisodeRecord,
  ImplicitSignal,
  MemoryLayerAssembly,
  SemanticMemoryRulePlaceholder,
  WorkingMemoryLayerItem,
} from "./episodicMemoryService";

export const IMPLICIT_SIGNAL_WEIGHTS: Readonly<Record<ImplicitSignal, number>> =
  {
    DIRECT_ACCEPT: 1,
    LIGHT_EDIT: 0.45,
    HEAVY_REWRITE: -0.45,
    FULL_REJECT: -0.8,
    UNDO_AFTER_ACCEPT: -1,
    REPEATED_SCENE_SKILL: 0.15,
  };

/**
 * Calculate decay score from forgetting-curve factors.
 *
 * Why: keep decay policy deterministic and independently testable.
 */
export function calculateDecayScore(args: {
  ageInDays: number;
  recallCount: number;
  importance: number;
}): number {
  const age = Math.max(0, args.ageInDays);
  const recall = Math.max(0, args.recallCount);
  const importance = Math.max(0, Math.min(1, args.importance));

  const baseDecay = Math.exp(-0.1 * age);
  const recallBoost = 1 + 0.2 * recall;
  const importanceBoost = 1 + 0.3 * importance;

  return Math.min(1, baseDecay * recallBoost * importanceBoost);
}

/**
 * Classify lifecycle level from decay score bands.
 */
export function classifyDecayLevel(score: number): DecayLevel {
  const value = Math.max(0, Math.min(1, score));
  if (value >= 0.7) {
    return "active";
  }
  if (value >= 0.3) {
    return "decaying";
  }
  if (value >= 0.1) {
    return "to_compress";
  }
  return "to_evict";
}

/**
 * Resolve implicit feedback into one of fixed signals and weights.
 */
export function resolveImplicitFeedback(args: {
  selectedIndex: number;
  candidateCount: number;
  editDistance: number;
  acceptedWithoutEdit?: boolean;
  undoAfterAccept?: boolean;
  repeatedSceneSkillCount?: number;
}): { signal: ImplicitSignal; weight: number } {
  if (args.undoAfterAccept) {
    return {
      signal: "UNDO_AFTER_ACCEPT",
      weight: IMPLICIT_SIGNAL_WEIGHTS.UNDO_AFTER_ACCEPT,
    };
  }

  if (args.selectedIndex < 0 || args.candidateCount <= 0) {
    return {
      signal: "FULL_REJECT",
      weight: IMPLICIT_SIGNAL_WEIGHTS.FULL_REJECT,
    };
  }

  const repeatedCount = Math.max(0, args.repeatedSceneSkillCount ?? 0);
  if (
    repeatedCount > 0 &&
    args.editDistance >= 0.2 &&
    args.editDistance <= 0.6
  ) {
    return {
      signal: "REPEATED_SCENE_SKILL",
      weight: IMPLICIT_SIGNAL_WEIGHTS.REPEATED_SCENE_SKILL * repeatedCount,
    };
  }

  if (args.acceptedWithoutEdit || args.editDistance === 0) {
    return {
      signal: "DIRECT_ACCEPT",
      weight: IMPLICIT_SIGNAL_WEIGHTS.DIRECT_ACCEPT,
    };
  }

  if (args.editDistance < 0.2) {
    return {
      signal: "LIGHT_EDIT",
      weight: IMPLICIT_SIGNAL_WEIGHTS.LIGHT_EDIT,
    };
  }

  if (args.editDistance > 0.6) {
    return {
      signal: "HEAVY_REWRITE",
      weight: IMPLICIT_SIGNAL_WEIGHTS.HEAVY_REWRITE,
    };
  }

  if (repeatedCount > 0) {
    return {
      signal: "REPEATED_SCENE_SKILL",
      weight: IMPLICIT_SIGNAL_WEIGHTS.REPEATED_SCENE_SKILL * repeatedCount,
    };
  }

  return {
    signal: "LIGHT_EDIT",
    weight: IMPLICIT_SIGNAL_WEIGHTS.LIGHT_EDIT,
  };
}

/**
 * Assemble three layers into a CE-consumable memory object.
 */
export function assembleMemoryLayers(args: {
  projectId: string;
  sessionId: string;
  working: WorkingMemoryLayerItem[];
  episodes: EpisodeRecord[];
  semanticRules: SemanticMemoryRulePlaceholder[];
  memoryDegraded?: boolean;
  fallbackRules?: string[];
}): MemoryLayerAssembly {
  return {
    immediate: {
      projectId: args.projectId,
      sessionId: args.sessionId,
      items: [...args.working],
    },
    episodic: {
      items: [...args.episodes],
    },
    settings: {
      rules: [...args.semanticRules],
      memoryDegraded: args.memoryDegraded ?? false,
      fallbackRules: [...(args.fallbackRules ?? [])],
    },
  };
}
