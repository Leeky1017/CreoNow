/**
 * ModelRouter — Route AI requests to the appropriate model + provider.
 *
 * Takes a TaskType and resolves to the correct model via ModelConfig,
 * then resolves the provider config via ProviderResolver. Bridges the gap
 * between Skill-level task intent and low-level provider dispatch.
 *
 * INV-6: Part of the Skill pipeline — all LLM calls must go through routing.
 * INV-9: Passes resolved model ID downstream for cost tracking.
 * INV-10: Throws typed errors when config is missing; caller handles gracefully.
 */

import type { ProviderConfig } from "./providerResolver";
import {
  type TaskType,
  type ModelSettings,
  resolveModelConfig,
  ModelConfigError,
} from "./modelConfig";

// ─── Types ──────────────────────────────────────────────────────────

/** Resolved route: provider config enriched with the specific model to use */
export interface RoutedProvider {
  readonly provider: ProviderConfig["provider"];
  readonly baseUrl: string;
  readonly apiKey: string | undefined;
  readonly timeoutMs: number;
  readonly model: string;
  readonly taskType: TaskType;
}

/** ProviderResolver abstraction — matches createProviderResolver().resolve() */
export interface ProviderResolverLike {
  resolve(): { primary: ProviderConfig; backup: ProviderConfig | null };
}

/** Routing error when provider is unavailable */
export class ProviderUnavailableError extends Error {
  readonly code = "PROVIDER_UNAVAILABLE" as const;

  constructor(message: string) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}

// ─── ModelRouter ────────────────────────────────────────────────────

export interface ModelRouter {
  /**
   * Route a task to the appropriate model + provider.
   * @throws ModelConfigError if no model is configured
   * @throws ProviderUnavailableError if provider resolution fails
   */
  route(taskType: TaskType): RoutedProvider;

  /** Update model settings at runtime (e.g., after user changes settings) */
  updateSettings(settings: ModelSettings): void;
}

export function createModelRouter(deps: {
  settings: ModelSettings;
  providerResolver: ProviderResolverLike;
}): ModelRouter {
  let currentSettings = deps.settings;
  const resolver = deps.providerResolver;

  return {
    route(taskType: TaskType): RoutedProvider {
      // Step 1: Resolve which model to use for this task
      const assignment = resolveModelConfig(currentSettings);
      const model = assignment[taskType];

      // Step 2: Resolve provider config
      let resolution: { primary: ProviderConfig; backup: ProviderConfig | null };
      try {
        resolution = resolver.resolve();
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Provider resolution failed";
        throw new ProviderUnavailableError(msg);
      }

      const providerConfig = resolution.primary;

      return {
        provider: providerConfig.provider,
        baseUrl: providerConfig.baseUrl,
        apiKey: providerConfig.apiKey,
        timeoutMs: providerConfig.timeoutMs,
        model,
        taskType,
      };
    },

    updateSettings(settings: ModelSettings): void {
      currentSettings = settings;
    },
  };
}

// Re-export for convenience
export { ModelConfigError };
