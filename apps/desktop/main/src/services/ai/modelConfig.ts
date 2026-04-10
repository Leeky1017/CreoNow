/**
 * ModelConfig — Task-based model assignment resolution.
 *
 * Reads primary_model / auxiliary_model from settings and assigns models
 * to task types. Single model → all tasks share it. No model → typed error.
 *
 * INV-6: Model routing is part of the Skill pipeline's provider resolution.
 * INV-9: Resolved config feeds into CostTracker's model identification.
 */

// ─── Types ──────────────────────────────────────────────────────────

/** Task categories that may use different models */
export type TaskType = "writing" | "judge" | "embedding" | "general";

/** Per-task model assignment after resolution */
export interface ModelAssignment {
  readonly writing: string;
  readonly judge: string;
  readonly embedding: string;
  readonly general: string;
}

/** Raw model settings as stored in SQLite / proxy settings */
export interface ModelSettings {
  primaryModel: string | null | undefined;
  auxiliaryModel: string | null | undefined;
}

/** Typed error for missing model configuration */
export class ModelConfigError extends Error {
  readonly code = "MODEL_CONFIG_MISSING" as const;

  constructor(message: string) {
    super(message);
    this.name = "ModelConfigError";
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalize(value: string | null | undefined): string | null {
  if (!isNonEmptyString(value)) return null;
  return value.trim();
}

// ─── Core resolution ────────────────────────────────────────────────

/**
 * Resolve model assignment from raw settings.
 *
 * Rules:
 * - Both primary and auxiliary present → primary for writing/general,
 *   auxiliary for judge/embedding
 * - Only one model present → share it across all task types
 * - Neither present → throw ModelConfigError
 */
export function resolveModelConfig(settings: ModelSettings): ModelAssignment {
  const primary = normalize(settings.primaryModel);
  const auxiliary = normalize(settings.auxiliaryModel);

  if (primary === null && auxiliary === null) {
    throw new ModelConfigError(
      "No model configured. Please set at least one model in AI settings " +
        "(primary_model or auxiliary_model).",
    );
  }

  // Only one model → share across all tasks
  if (primary !== null && auxiliary === null) {
    return { writing: primary, judge: primary, embedding: primary, general: primary };
  }

  if (primary === null && auxiliary !== null) {
    return { writing: auxiliary, judge: auxiliary, embedding: auxiliary, general: auxiliary };
  }

  // Both present → split by task responsibility
  // Guard verified both non-null above, so assert safely via narrowing
  if (primary !== null && auxiliary !== null) {
    return {
      writing: primary,
      general: primary,
      judge: auxiliary,
      embedding: auxiliary,
    };
  }

  // Unreachable — all null combinations handled above
  throw new ModelConfigError("Unexpected model config state");
}

/**
 * Get the model for a specific task type from settings.
 * Convenience wrapper around resolveModelConfig.
 */
export function getModelForTask(
  settings: ModelSettings,
  taskType: TaskType,
): string {
  const assignment = resolveModelConfig(settings);
  return assignment[taskType];
}
