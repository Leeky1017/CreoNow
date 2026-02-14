import {
  resolveRuntimeGovernanceFromEnv as resolveFromSharedEnv,
  RUNTIME_GOVERNANCE_DEFAULTS,
  type RuntimeGovernance,
  type RuntimeGovernanceEnv,
} from "@shared/runtimeGovernance";

export { RUNTIME_GOVERNANCE_DEFAULTS };
export type { RuntimeGovernance, RuntimeGovernanceEnv };

export function resolveRuntimeGovernanceFromEnv(
  env: RuntimeGovernanceEnv,
): RuntimeGovernance {
  return resolveFromSharedEnv(env);
}

export function resolveRuntimeGovernance(): RuntimeGovernance {
  return resolveRuntimeGovernanceFromEnv(process.env);
}
