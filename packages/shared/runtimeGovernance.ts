export type RuntimeGovernanceEnv = Record<string, string | undefined>;

export type RuntimeGovernance = {
  ipc: {
    maxPayloadBytes: number;
  };
  ai: {
    timeoutMs: number;
    retryBackoffMs: readonly number[];
    sessionTokenBudget: number;
  };
  kg: {
    queryTimeoutMs: number;
  };
  rag: {
    maxTokens: number;
  };
};

export const RUNTIME_GOVERNANCE_DEFAULTS: RuntimeGovernance = {
  ipc: {
    maxPayloadBytes: 10 * 1024 * 1024,
  },
  ai: {
    timeoutMs: 10_000,
    retryBackoffMs: [1_000, 2_000, 4_000],
    sessionTokenBudget: 200_000,
  },
  kg: {
    queryTimeoutMs: 2_000,
  },
  rag: {
    maxTokens: 1_500,
  },
};

function pickRaw(args: {
  env: RuntimeGovernanceEnv;
  primaryKey: string;
  legacyKey?: string;
}): string | undefined {
  const primary = args.env[args.primaryKey];
  if (typeof primary === "string") {
    return primary;
  }

  if (!args.legacyKey) {
    return undefined;
  }
  const legacy = args.env[args.legacyKey];
  if (typeof legacy === "string") {
    return legacy;
  }

  return undefined;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (typeof raw !== "string") {
    return fallback;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return fallback;
  }
  if (!/^\d+$/u.test(trimmed)) {
    return fallback;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parsePositiveIntList(
  raw: string | undefined,
  fallback: readonly number[],
): readonly number[] {
  if (typeof raw !== "string") {
    return fallback;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.includes(";")) {
    return fallback;
  }

  const parts = trimmed.split(",").map((part) => part.trim());
  if (parts.length === 0) {
    return fallback;
  }

  const parsed: number[] = [];
  for (const part of parts) {
    if (part.length === 0) {
      return fallback;
    }
    if (!/^\d+$/u.test(part)) {
      return fallback;
    }
    const value = Number.parseInt(part, 10);
    if (!Number.isFinite(value) || value <= 0) {
      return fallback;
    }
    parsed.push(value);
  }

  if (parsed.length === 0) {
    return fallback;
  }
  return parsed;
}

export function resolveRuntimeGovernanceFromEnv(
  env: RuntimeGovernanceEnv,
): RuntimeGovernance {
  const ipcMaxPayload = parsePositiveInt(
    pickRaw({
      env,
      primaryKey: "CN_IPC_MAX_PAYLOAD_BYTES",
      legacyKey: "CREONOW_IPC_MAX_PAYLOAD_BYTES",
    }),
    RUNTIME_GOVERNANCE_DEFAULTS.ipc.maxPayloadBytes,
  );

  const aiTimeoutMs = parsePositiveInt(
    pickRaw({
      env,
      primaryKey: "CN_AI_TIMEOUT_MS",
      legacyKey: "CREONOW_AI_TIMEOUT_MS",
    }),
    RUNTIME_GOVERNANCE_DEFAULTS.ai.timeoutMs,
  );
  const aiRetryBackoffMs = parsePositiveIntList(
    pickRaw({
      env,
      primaryKey: "CN_AI_RETRY_BACKOFF_MS",
      legacyKey: "CREONOW_AI_RETRY_BACKOFF_MS",
    }),
    RUNTIME_GOVERNANCE_DEFAULTS.ai.retryBackoffMs,
  );
  const aiSessionTokenBudget = parsePositiveInt(
    pickRaw({
      env,
      primaryKey: "CN_AI_SESSION_TOKEN_BUDGET",
      legacyKey: "CREONOW_AI_SESSION_TOKEN_BUDGET",
    }),
    RUNTIME_GOVERNANCE_DEFAULTS.ai.sessionTokenBudget,
  );

  const kgQueryTimeoutMs = parsePositiveInt(
    pickRaw({
      env,
      primaryKey: "CN_KG_QUERY_TIMEOUT_MS",
      legacyKey: "CREONOW_KG_QUERY_TIMEOUT_MS",
    }),
    RUNTIME_GOVERNANCE_DEFAULTS.kg.queryTimeoutMs,
  );

  const ragMaxTokens = parsePositiveInt(
    pickRaw({
      env,
      primaryKey: "CN_RAG_MAX_TOKENS",
      legacyKey: "CREONOW_RAG_MAX_TOKENS",
    }),
    RUNTIME_GOVERNANCE_DEFAULTS.rag.maxTokens,
  );

  return {
    ipc: {
      maxPayloadBytes: ipcMaxPayload,
    },
    ai: {
      timeoutMs: aiTimeoutMs,
      retryBackoffMs: aiRetryBackoffMs,
      sessionTokenBudget: aiSessionTokenBudget,
    },
    kg: {
      queryTimeoutMs: kgQueryTimeoutMs,
    },
    rag: {
      maxTokens: ragMaxTokens,
    },
  };
}
