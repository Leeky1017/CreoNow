import {
  resolveRuntimeGovernanceFromEnv as resolveFromSharedEnv,
  RUNTIME_GOVERNANCE_DEFAULTS,
  type RuntimeGovernance,
  type RuntimeGovernanceEnv,
} from "@shared/runtimeGovernance";

export { RUNTIME_GOVERNANCE_DEFAULTS };
export type { RuntimeGovernance, RuntimeGovernanceEnv };

function readPreloadEnv(): RuntimeGovernanceEnv {
  const maybeProcess = (
    globalThis as {
      process?: {
        env?: RuntimeGovernanceEnv;
      };
    }
  ).process;

  return maybeProcess?.env ?? {};
}

export function resolveRuntimeGovernanceFromEnv(
  env: RuntimeGovernanceEnv,
): RuntimeGovernance {
  return resolveFromSharedEnv(env);
}

export function resolveRuntimeGovernance(): RuntimeGovernance {
  return resolveRuntimeGovernanceFromEnv(readPreloadEnv());
}
