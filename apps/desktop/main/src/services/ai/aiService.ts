import { randomUUID } from "node:crypto";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type {
  AiStreamEvent,
  AiStreamTerminal,
} from "../../../../../../packages/shared/types/ai";
import type { Logger } from "../../logging/logger";
import {
  createSkillScheduler,
  type SkillSchedulerTerminal,
} from "../skills/skillScheduler";
import { startFakeAiServer, type FakeAiServer } from "./fakeAiServer";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type AiProvider = "anthropic" | "openai" | "proxy";

export type AiService = {
  runSkill: (args: {
    skillId: string;
    systemPrompt?: string;
    input: string;
    timeoutMs?: number;
    mode: "agent" | "plan" | "ask";
    model: string;
    system?: string;
    context?: { projectId?: string; documentId?: string };
    stream: boolean;
    ts: number;
    emitEvent: (event: AiStreamEvent) => void;
  }) => Promise<
    ServiceResult<{ executionId: string; runId: string; outputText?: string }>
  >;
  listModels: () => Promise<
    ServiceResult<{
      source: "proxy" | "openai" | "anthropic";
      items: Array<{ id: string; name: string; provider: string }>;
    }>
  >;
  cancel: (args: {
    executionId?: string;
    runId?: string;
    ts: number;
  }) => ServiceResult<{ canceled: true }>;
  feedback: (args: {
    runId: string;
    action: "accept" | "reject" | "partial";
    evidenceRef: string;
    ts: number;
  }) => ServiceResult<{ recorded: true }>;
};

type JsonObject = Record<string, unknown>;

type ProviderConfig = {
  provider: AiProvider;
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
};

type ProviderResolution = {
  primary: ProviderConfig;
  backup: ProviderConfig | null;
};

type ProviderMode = "openai-compatible" | "openai-byok" | "anthropic-byok";

type ProviderCredentials = {
  baseUrl: string | null;
  apiKey: string | null;
};

type ProxySettings = {
  enabled: boolean;
  baseUrl: string | null;
  apiKey: string | null;
  providerMode?: ProviderMode;
  openAiCompatible?: ProviderCredentials;
  openAiByok?: ProviderCredentials;
  anthropicByok?: ProviderCredentials;
  openAiCompatibleBaseUrl?: string | null;
  openAiCompatibleApiKey?: string | null;
  openAiByokBaseUrl?: string | null;
  openAiByokApiKey?: string | null;
  anthropicByokBaseUrl?: string | null;
  anthropicByokApiKey?: string | null;
};

type ProviderHealthState = {
  status: "healthy" | "degraded";
  consecutiveFailures: number;
  degradedAtMs: number | null;
};

type RunEntry = {
  executionId: string;
  runId: string;
  traceId: string;
  controller: AbortController;
  timeoutTimer: NodeJS.Timeout | null;
  completionTimer: NodeJS.Timeout | null;
  stream: boolean;
  startedAt: number;
  terminal: AiStreamTerminal | null;
  doneEmitted: boolean;
  schedulerTerminalResolved: boolean;
  resolveSchedulerTerminal: (terminal: SkillSchedulerTerminal) => void;
  seq: number;
  outputText: string;
  emitEvent: (event: AiStreamEvent) => void;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_SKILL_TIMEOUT_MS = 30_000;
const MAX_SKILL_TIMEOUT_MS = 120_000;
const DEFAULT_LLM_RATE_LIMIT_PER_MINUTE = 60;
const DEFAULT_RETRY_BACKOFF_MS = [1_000, 2_000, 4_000] as const;
const PROVIDER_FAILURE_THRESHOLD = 3;
const PROVIDER_HALF_OPEN_AFTER_MS = 15 * 60 * 1000;
const DEFAULT_SESSION_TOKEN_BUDGET = 200_000;
const DEFAULT_REQUEST_MAX_TOKENS_ESTIMATE = 256;

/**
 * Narrow an unknown value to a JSON object.
 */
function asObject(x: unknown): JsonObject | null {
  if (typeof x !== "object" || x === null) {
    return null;
  }
  return x as JsonObject;
}

/**
 * Return a stable IPC error wrapper.
 *
 * Why: errors must be deterministic for E2E assertions and must not leak secrets.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

/**
 * Combine stable + dynamic system prompt parts into a single system text.
 *
 * Why: skills provide a stable `systemPrompt` while features like memory injection
 * add a dynamic `system` overlay; providers expect a single system string.
 */
function combineSystemText(args: {
  systemPrompt?: string;
  system?: string;
}): string | null {
  const parts: string[] = [];

  const stable = typeof args.systemPrompt === "string" ? args.systemPrompt : "";
  if (stable.trim().length > 0) {
    // Intentionally preserve bytes: do not trim/normalize prompt content.
    parts.push(stable);
  }

  const dynamic = typeof args.system === "string" ? args.system : "";
  if (dynamic.trim().length > 0) {
    // Intentionally preserve bytes: do not trim/normalize prompt content.
    parts.push(dynamic);
  }

  return parts.length > 0 ? parts.join("\n\n") : null;
}

/**
 * Build deterministic mode-specific system hint text.
 */
function modeSystemHint(mode: "agent" | "plan" | "ask"): string | null {
  if (mode === "plan") {
    return "Mode: plan\nFirst produce a concise step-by-step plan before final output.";
  }
  if (mode === "agent") {
    return "Mode: agent\nAct as an autonomous writing assistant and make concrete edits.";
  }
  return null;
}

/**
 * Estimate token usage from UTF-8 byte length with deterministic approximation.
 *
 * Why: avoid provider-specific tokenizer drift while keeping quota accounting stable.
 */
function estimateTokenCount(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(Buffer.byteLength(text, "utf8") / 4));
}

/**
 * Parse timeout (ms) from env with a safe default.
 */
function parseTimeoutMs(env: NodeJS.ProcessEnv): number {
  const raw = env.CREONOW_AI_TIMEOUT_MS;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return DEFAULT_TIMEOUT_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }
  return parsed;
}

/**
 * Resolve per-skill execution timeout with default + clamp.
 */
function resolveSkillTimeoutMs(timeoutMs: number | undefined): number {
  if (
    typeof timeoutMs !== "number" ||
    !Number.isFinite(timeoutMs) ||
    !Number.isInteger(timeoutMs)
  ) {
    return DEFAULT_SKILL_TIMEOUT_MS;
  }
  if (timeoutMs <= 0) {
    return DEFAULT_SKILL_TIMEOUT_MS;
  }
  return Math.min(timeoutMs, MAX_SKILL_TIMEOUT_MS);
}

/**
 * Check whether the current process is running in E2E mode.
 */
function isE2E(env: NodeJS.ProcessEnv): boolean {
  return env.CREONOW_E2E === "1";
}

/**
 * Parse AI provider enum from env.
 */
function parseProvider(env: NodeJS.ProcessEnv): AiProvider | null {
  const raw = env.CREONOW_AI_PROVIDER;
  if (raw === "anthropic" || raw === "openai" || raw === "proxy") {
    return raw;
  }
  return null;
}

/**
 * Join a provider base URL with an endpoint path while preserving base path prefixes.
 */
function buildApiUrl(args: { baseUrl: string; endpointPath: string }): string {
  const base = new URL(args.baseUrl.trim());
  const endpoint = args.endpointPath.startsWith("/")
    ? args.endpointPath
    : `/${args.endpointPath}`;

  if (!base.pathname.endsWith("/")) {
    base.pathname = `${base.pathname}/`;
  }

  const basePathNoSlash = base.pathname.endsWith("/")
    ? base.pathname.slice(0, -1)
    : base.pathname;
  const normalizedEndpoint =
    basePathNoSlash.endsWith("/v1") && endpoint.startsWith("/v1/")
      ? endpoint.slice(3)
      : endpoint;

  return new URL(normalizedEndpoint.slice(1), base.toString()).toString();
}

/**
 * Parse upstream JSON safely and return deterministic errors for non-JSON bodies.
 */
async function parseJsonResponse(
  res: Response,
): Promise<ServiceResult<unknown>> {
  const bodyText = await res.text();
  try {
    return { ok: true, data: JSON.parse(bodyText) as unknown };
  } catch {
    return ipcError("LLM_API_ERROR", "Non-JSON upstream response");
  }
}

/**
 * Normalize settings provider mode with backward compatibility.
 */
function resolveSettingsProviderMode(settings: ProxySettings): ProviderMode {
  if (
    settings.providerMode === "openai-compatible" ||
    settings.providerMode === "openai-byok" ||
    settings.providerMode === "anthropic-byok"
  ) {
    return settings.providerMode;
  }
  return settings.enabled ? "openai-compatible" : "openai-byok";
}

/**
 * Resolve provider credentials from settings based on provider mode.
 */
function resolveSettingsProviderCredentials(args: {
  settings: ProxySettings;
  mode: ProviderMode;
}): {
  provider: AiProvider;
  credentials: ProviderCredentials;
  mode: ProviderMode;
} {
  const openAiCompatible: ProviderCredentials = {
    baseUrl:
      args.settings.openAiCompatible?.baseUrl ??
      args.settings.openAiCompatibleBaseUrl ??
      args.settings.baseUrl ??
      null,
    apiKey:
      args.settings.openAiCompatible?.apiKey ??
      args.settings.openAiCompatibleApiKey ??
      args.settings.apiKey ??
      null,
  };

  const openAiByok: ProviderCredentials = {
    baseUrl:
      args.settings.openAiByok?.baseUrl ??
      args.settings.openAiByokBaseUrl ??
      args.settings.baseUrl ??
      null,
    apiKey:
      args.settings.openAiByok?.apiKey ??
      args.settings.openAiByokApiKey ??
      args.settings.apiKey ??
      null,
  };

  const anthropicByok: ProviderCredentials = {
    baseUrl:
      args.settings.anthropicByok?.baseUrl ??
      args.settings.anthropicByokBaseUrl ??
      args.settings.baseUrl ??
      null,
    apiKey:
      args.settings.anthropicByok?.apiKey ??
      args.settings.anthropicByokApiKey ??
      args.settings.apiKey ??
      null,
  };

  if (args.mode === "anthropic-byok") {
    return {
      provider: "anthropic",
      mode: args.mode,
      credentials: anthropicByok,
    };
  }

  if (args.mode === "openai-byok") {
    return {
      provider: "openai",
      mode: args.mode,
      credentials: openAiByok,
    };
  }

  return {
    provider: "proxy",
    mode: args.mode,
    credentials: openAiCompatible,
  };
}

/**
 * Build a provider config from credential inputs.
 */
function buildProviderConfigFromCredentials(args: {
  provider: AiProvider;
  credentials: ProviderCredentials;
  timeoutMs: number;
  env: NodeJS.ProcessEnv;
}): ProviderConfig | null {
  const baseUrl =
    typeof args.credentials.baseUrl === "string"
      ? args.credentials.baseUrl.trim()
      : "";
  if (baseUrl.length === 0) {
    return null;
  }

  const apiKey =
    typeof args.credentials.apiKey === "string" &&
    args.credentials.apiKey.trim().length > 0
      ? args.credentials.apiKey
      : undefined;

  if (args.provider !== "proxy" && !isE2E(args.env) && !apiKey) {
    return null;
  }

  return {
    provider: args.provider,
    baseUrl,
    apiKey,
    timeoutMs: args.timeoutMs,
  };
}

/**
 * Resolve a best-effort backup provider config from settings.
 */
function resolveSettingsBackupProvider(args: {
  settings: ProxySettings;
  primary: ProviderConfig;
  timeoutMs: number;
  env: NodeJS.ProcessEnv;
}): ProviderConfig | null {
  const openAiCompatible: ProviderCredentials = {
    baseUrl:
      args.settings.openAiCompatible?.baseUrl ??
      args.settings.openAiCompatibleBaseUrl ??
      args.settings.baseUrl ??
      null,
    apiKey:
      args.settings.openAiCompatible?.apiKey ??
      args.settings.openAiCompatibleApiKey ??
      args.settings.apiKey ??
      null,
  };
  const openAiByok: ProviderCredentials = {
    baseUrl:
      args.settings.openAiByok?.baseUrl ??
      args.settings.openAiByokBaseUrl ??
      args.settings.baseUrl ??
      null,
    apiKey:
      args.settings.openAiByok?.apiKey ??
      args.settings.openAiByokApiKey ??
      args.settings.apiKey ??
      null,
  };
  const anthropicByok: ProviderCredentials = {
    baseUrl:
      args.settings.anthropicByok?.baseUrl ??
      args.settings.anthropicByokBaseUrl ??
      args.settings.baseUrl ??
      null,
    apiKey:
      args.settings.anthropicByok?.apiKey ??
      args.settings.anthropicByokApiKey ??
      args.settings.apiKey ??
      null,
  };

  const candidates: ProviderConfig[] = [];

  const pushCandidate = (
    provider: AiProvider,
    credentials: ProviderCredentials,
  ) => {
    const cfg = buildProviderConfigFromCredentials({
      provider,
      credentials,
      timeoutMs: args.timeoutMs,
      env: args.env,
    });
    if (!cfg) {
      return;
    }
    if (
      cfg.provider === args.primary.provider &&
      cfg.baseUrl === args.primary.baseUrl &&
      cfg.apiKey === args.primary.apiKey
    ) {
      return;
    }
    candidates.push(cfg);
  };

  if (args.primary.provider !== "anthropic") {
    pushCandidate("anthropic", anthropicByok);
  }
  if (args.primary.provider !== "openai") {
    pushCandidate("openai", openAiByok);
  }

  const mode = resolveSettingsProviderMode(args.settings);
  if (
    args.primary.provider !== "proxy" &&
    (mode === "openai-compatible" || args.settings.enabled)
  ) {
    pushCandidate("proxy", openAiCompatible);
  }

  return candidates[0] ?? null;
}

/**
 * Read SSE messages from a fetch response body.
 *
 * Why: both OpenAI and Anthropic streaming are delivered as SSE.
 */
async function* readSse(args: {
  body: ReadableStream<Uint8Array>;
}): AsyncGenerator<{ event: string | null; data: string }> {
  const decoder = new TextDecoder();
  const reader = args.body.getReader();

  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const sepIndex = buffer.indexOf("\n\n");
      if (sepIndex < 0) {
        break;
      }

      const rawEvent = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);

      const lines = rawEvent.split("\n");
      let event: string | null = null;
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.slice("event:".length).trim();
          continue;
        }
        if (line.startsWith("data:")) {
          dataLines.push(line.slice("data:".length).trimStart());
        }
      }

      if (dataLines.length === 0) {
        continue;
      }

      yield { event, data: dataLines.join("\n") };
    }
  }
}

/**
 * Extract assistant text from an OpenAI non-stream response.
 */
function extractOpenAiText(json: unknown): string | null {
  const obj = asObject(json);
  const choices = obj ? obj.choices : null;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }
  const first = asObject(choices[0]);
  const message = asObject(first?.message);
  const content = message?.content;
  return extractOpenAiContentText(content);
}

/**
 * Extract delta text from an OpenAI streaming chunk.
 */
function extractOpenAiDelta(json: unknown): string | null {
  const obj = asObject(json);
  const choices = obj ? obj.choices : null;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }
  const first = asObject(choices[0]);
  const delta = asObject(first?.delta);
  const content = delta?.content;
  return extractOpenAiContentText(content);
}

/**
 * Extract human-readable text from OpenAI-compatible content payloads.
 */
function extractOpenAiContentText(content: unknown): string | null {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const parts: string[] = [];
  for (const item of content) {
    if (typeof item === "string") {
      if (item.length > 0) {
        parts.push(item);
      }
      continue;
    }

    const row = asObject(item);
    if (!row) {
      continue;
    }

    const text = row.text;
    if (typeof text === "string" && text.length > 0) {
      parts.push(text);
      continue;
    }

    const nested = row.content;
    if (typeof nested === "string" && nested.length > 0) {
      parts.push(nested);
    }
  }

  if (parts.length === 0) {
    return null;
  }
  return parts.join("");
}

/**
 * Extract assistant text from an Anthropic non-stream response.
 */
function extractAnthropicText(json: unknown): string | null {
  const obj = asObject(json);
  const content = obj ? obj.content : null;
  if (!Array.isArray(content) || content.length === 0) {
    return null;
  }
  const first = asObject(content[0]);
  const text = first?.text;
  return typeof text === "string" ? text : null;
}

/**
 * Extract delta text from an Anthropic streaming chunk.
 */
function extractAnthropicDelta(json: unknown): string | null {
  const obj = asObject(json);
  const delta = asObject(obj?.delta);
  const text = delta?.text;
  return typeof text === "string" ? text : null;
}

/**
 * Build a stable provider display name for model catalog results.
 */
function providerDisplayName(provider: AiProvider): string {
  if (provider === "proxy") {
    return "Proxy";
  }
  if (provider === "openai") {
    return "OpenAI";
  }
  return "Anthropic";
}

/**
 * Extract model items from an OpenAI-compatible `/v1/models` response.
 */
function extractOpenAiModels(
  json: unknown,
): Array<{ id: string; name: string }> {
  const obj = asObject(json);
  const data = obj?.data;
  if (!Array.isArray(data)) {
    return [];
  }

  const seen = new Set<string>();
  const items: Array<{ id: string; name: string }> = [];
  for (const raw of data) {
    const row = asObject(raw);
    const id = typeof row?.id === "string" ? row.id.trim() : "";
    if (id.length === 0 || seen.has(id)) {
      continue;
    }

    const displayName =
      typeof row?.name === "string" && row.name.trim().length > 0
        ? row.name.trim()
        : typeof row?.display_name === "string" &&
            row.display_name.trim().length > 0
          ? row.display_name.trim()
          : id;

    seen.add(id);
    items.push({ id, name: displayName });
  }

  return items.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Create an IpcError for upstream failures without leaking secrets.
 */
/**
 * Map upstream HTTP status codes to deterministic IPC error codes.
 *
 * Why: tests and UI assertions rely on stable semantics (401/403 → AI_AUTH_FAILED,
 * 429 → AI_RATE_LIMITED) while keeping other upstream failures grouped as LLM_API_ERROR.
 */
export function mapUpstreamStatusToIpcErrorCode(status: number): IpcErrorCode {
  if (status === 401 || status === 403) {
    return "AI_AUTH_FAILED";
  }
  if (status === 429) {
    return "AI_RATE_LIMITED";
  }
  return "LLM_API_ERROR";
}

function upstreamError(args: { status: number; message: string }): IpcError {
  const code = mapUpstreamStatusToIpcErrorCode(args.status);
  const message =
    code === "AI_AUTH_FAILED"
      ? "AI upstream unauthorized"
      : code === "AI_RATE_LIMITED"
        ? "AI upstream rate limited"
        : args.message;
  return {
    code,
    message,
    details: { status: args.status },
  };
}

/**
 * Extract a concise error message from an upstream non-2xx response.
 */
async function readUpstreamErrorMessage(args: {
  res: Response;
  fallback: string;
}): Promise<string> {
  const contentType = args.res.headers.get("content-type") ?? "";
  const raw = await args.res.text();

  if (contentType.toLowerCase().includes("application/json")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      const obj = asObject(parsed);
      const nestedError = asObject(obj?.error);
      const nestedMessage = nestedError?.message;
      if (
        typeof nestedMessage === "string" &&
        nestedMessage.trim().length > 0
      ) {
        return nestedMessage.trim();
      }
      const directMessage = obj?.message;
      if (
        typeof directMessage === "string" &&
        directMessage.trim().length > 0
      ) {
        return directMessage.trim();
      }
    } catch {
      return args.fallback;
    }
  }

  return args.fallback;
}

/**
 * Build mapped IPC error from an upstream non-2xx response.
 */
async function buildUpstreamHttpError(args: {
  res: Response;
  fallbackMessage: string;
}): Promise<IpcError> {
  const upstreamMessage = await readUpstreamErrorMessage({
    res: args.res,
    fallback: args.fallbackMessage,
  });
  const mapped = upstreamError({
    status: args.res.status,
    message: upstreamMessage,
  });
  return {
    ...mapped,
    details: {
      ...(asObject(mapped.details) ?? {}),
      upstreamMessage,
    },
  };
}

/**
 * Build provider config from env, starting the fake server in E2E by default.
 */
async function resolveProviderConfig(deps: {
  logger: Logger;
  env: NodeJS.ProcessEnv;
  getFakeServer: () => Promise<FakeAiServer>;
  getProxySettings?: () => ProxySettings | null;
}): Promise<ServiceResult<ProviderResolution>> {
  const timeoutMs = parseTimeoutMs(deps.env);

  const proxyEnabled = deps.env.CREONOW_AI_PROXY_ENABLED === "1";
  if (proxyEnabled) {
    const baseUrl = deps.env.CREONOW_AI_PROXY_BASE_URL;
    if (typeof baseUrl !== "string" || baseUrl.trim().length === 0) {
      return ipcError(
        "INVALID_ARGUMENT",
        "proxy baseUrl is required when proxy enabled (CREONOW_AI_PROXY_BASE_URL)",
      );
    }
    return {
      ok: true,
      data: {
        primary: {
          provider: "proxy",
          baseUrl,
          apiKey:
            typeof deps.env.CREONOW_AI_PROXY_API_KEY === "string" &&
            deps.env.CREONOW_AI_PROXY_API_KEY.length > 0
              ? deps.env.CREONOW_AI_PROXY_API_KEY
              : undefined,
          timeoutMs,
        },
        backup: null,
      },
    };
  }

  const proxyFromSettings = deps.getProxySettings?.() ?? null;
  if (proxyFromSettings) {
    const mode = resolveSettingsProviderMode(proxyFromSettings);
    const resolved = resolveSettingsProviderCredentials({
      settings: proxyFromSettings,
      mode,
    });

    if (mode !== "openai-compatible" || proxyFromSettings.enabled) {
      const primary = buildProviderConfigFromCredentials({
        provider: resolved.provider,
        credentials: resolved.credentials,
        timeoutMs,
        env: deps.env,
      });
      if (!primary) {
        return ipcError("AI_NOT_CONFIGURED", "请先在设置中配置 AI 服务");
      }
      const backup = resolveSettingsBackupProvider({
        settings: proxyFromSettings,
        primary,
        timeoutMs,
        env: deps.env,
      });

      return {
        ok: true,
        data: {
          primary,
          backup,
        },
      };
    }
  }

  const provider =
    parseProvider(deps.env) ?? (isE2E(deps.env) ? "anthropic" : null);
  if (!provider) {
    return ipcError(
      "INVALID_ARGUMENT",
      "CREONOW_AI_PROVIDER is required (anthropic|openai|proxy)",
    );
  }

  const envBaseUrl = deps.env.CREONOW_AI_BASE_URL;
  const baseUrl =
    typeof envBaseUrl === "string" && envBaseUrl.trim().length > 0
      ? envBaseUrl
      : isE2E(deps.env)
        ? (await deps.getFakeServer()).baseUrl
        : null;

  if (!baseUrl) {
    return ipcError(
      "INVALID_ARGUMENT",
      "CREONOW_AI_BASE_URL is required (or set CREONOW_E2E=1 for fake-first)",
    );
  }

  const apiKey =
    typeof deps.env.CREONOW_AI_API_KEY === "string" &&
    deps.env.CREONOW_AI_API_KEY.length > 0
      ? deps.env.CREONOW_AI_API_KEY
      : undefined;

  if (!isE2E(deps.env) && provider !== "proxy" && !apiKey) {
    return ipcError("AI_NOT_CONFIGURED", "请先在设置中配置 AI 服务");
  }

  return {
    ok: true,
    data: {
      primary: {
        provider,
        baseUrl,
        apiKey,
        timeoutMs,
      },
      backup: null,
    },
  };
}

/**
 * Create the main-process AI service.
 *
 * Why: keep secrets + network + error mapping in the main process for stable IPC.
 */
export function createAiService(deps: {
  logger: Logger;
  env: NodeJS.ProcessEnv;
  getProxySettings?: () => ProxySettings | null;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  rateLimitPerMinute?: number;
  retryBackoffMs?: readonly number[];
  sessionTokenBudget?: number;
}): AiService {
  const runs = new Map<string, RunEntry>();
  const requestTimestamps: number[] = [];
  const providerHealthByKey = new Map<string, ProviderHealthState>();
  const sessionTokenTotalsByKey = new Map<string, number>();
  const skillScheduler = createSkillScheduler({
    globalConcurrencyLimit: 8,
    sessionQueueLimit: 20,
  });
  const now = deps.now ?? (() => Date.now());
  const sleep =
    deps.sleep ??
    ((ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      }));
  const rateLimitPerMinute =
    deps.rateLimitPerMinute ?? DEFAULT_LLM_RATE_LIMIT_PER_MINUTE;
  const retryBackoffMs = deps.retryBackoffMs ?? DEFAULT_RETRY_BACKOFF_MS;
  const sessionTokenBudget =
    deps.sessionTokenBudget ?? DEFAULT_SESSION_TOKEN_BUDGET;
  let fakeServerPromise: Promise<FakeAiServer> | null = null;

  const getFakeServer = async (): Promise<FakeAiServer> => {
    if (!fakeServerPromise) {
      fakeServerPromise = startFakeAiServer({
        logger: deps.logger,
        env: deps.env,
      });
    }
    return await fakeServerPromise;
  };

  /**
   * Build a stable session key used for queueing and token-budget accounting.
   */
  function resolveSessionKey(context?: {
    projectId?: string;
    documentId?: string;
  }): string {
    const projectId = context?.projectId?.trim() ?? "";
    if (projectId.length > 0) {
      return `project:${projectId}`;
    }

    const documentId = context?.documentId?.trim() ?? "";
    if (documentId.length > 0) {
      return `document:${documentId}`;
    }

    return "global";
  }

  function providerHealthKey(cfg: ProviderConfig): string {
    return `${cfg.provider}:${cfg.baseUrl}`;
  }

  function getProviderHealthState(cfg: ProviderConfig): ProviderHealthState {
    const key = providerHealthKey(cfg);
    const existing = providerHealthByKey.get(key);
    if (existing) {
      return existing;
    }

    const initial: ProviderHealthState = {
      status: "healthy",
      consecutiveFailures: 0,
      degradedAtMs: null,
    };
    providerHealthByKey.set(key, initial);
    return initial;
  }

  function setProviderHealthState(
    cfg: ProviderConfig,
    state: ProviderHealthState,
  ): void {
    providerHealthByKey.set(providerHealthKey(cfg), state);
  }

  function markProviderFailure(args: {
    cfg: ProviderConfig;
    traceId: string;
    reason: string;
  }): ProviderHealthState {
    const state = { ...getProviderHealthState(args.cfg) };
    state.consecutiveFailures += 1;

    if (state.consecutiveFailures >= PROVIDER_FAILURE_THRESHOLD) {
      const wasDegraded = state.status === "degraded";
      state.status = "degraded";
      state.degradedAtMs = now();
      if (!wasDegraded) {
        deps.logger.info("ai_provider_degraded", {
          traceId: args.traceId,
          provider: args.cfg.provider,
          baseUrl: args.cfg.baseUrl,
          failures: state.consecutiveFailures,
          reason: args.reason,
        });
      }
    }

    setProviderHealthState(args.cfg, state);
    return state;
  }

  function markProviderSuccess(args: {
    cfg: ProviderConfig;
    traceId: string;
    fromHalfOpen: boolean;
  }): void {
    const state = { ...getProviderHealthState(args.cfg) };
    const wasDegraded = state.status === "degraded";
    state.status = "healthy";
    state.consecutiveFailures = 0;
    state.degradedAtMs = null;
    setProviderHealthState(args.cfg, state);

    if (wasDegraded || args.fromHalfOpen) {
      deps.logger.info("ai_provider_recovered", {
        traceId: args.traceId,
        provider: args.cfg.provider,
        baseUrl: args.cfg.baseUrl,
        fromHalfOpen: args.fromHalfOpen,
      });
    }
  }

  function isProviderAvailabilityError(error: IpcError): boolean {
    return (
      error.code === "LLM_API_ERROR" ||
      error.code === "TIMEOUT" ||
      error.code === "SKILL_TIMEOUT"
    );
  }

  function buildProviderUnavailableError(args: {
    traceId: string;
    primary: ProviderConfig;
    backup: ProviderConfig | null;
  }): Err {
    return ipcError("AI_PROVIDER_UNAVAILABLE", "All AI providers unavailable", {
      traceId: args.traceId,
      primary: args.primary.provider,
      backup: args.backup?.provider ?? null,
    });
  }

  /**
   * Consume one request budget token from the fixed 60s window limiter.
   *
   * Why: P0 baseline requires deterministic quota protection before upstream calls.
   */
  function consumeRateLimitToken(): Err | null {
    const windowStart = now() - 60_000;
    while (
      requestTimestamps.length > 0 &&
      requestTimestamps[0] <= windowStart
    ) {
      requestTimestamps.shift();
    }

    if (requestTimestamps.length >= rateLimitPerMinute) {
      return ipcError("AI_RATE_LIMITED", "AI request rate limited");
    }

    requestTimestamps.push(now());
    return null;
  }

  /**
   * Fetch with P0 network retry and rate-limit baseline.
   *
   * Why: transient transport errors should retry with bounded backoff.
   */
  async function fetchWithPolicy(args: {
    url: string;
    init: RequestInit;
  }): Promise<ServiceResult<Response>> {
    const rateLimited = consumeRateLimitToken();
    if (rateLimited) {
      return rateLimited;
    }

    for (let attempt = 0; ; attempt += 1) {
      try {
        const res = await fetch(args.url, args.init);
        return { ok: true, data: res };
      } catch (error) {
        const signal = args.init.signal as AbortSignal | undefined;
        if (signal?.aborted) {
          return ipcError("TIMEOUT", "AI request timed out");
        }

        if (attempt >= retryBackoffMs.length) {
          return ipcError(
            "LLM_API_ERROR",
            error instanceof Error ? error.message : "AI request failed",
          );
        }

        await sleep(retryBackoffMs[attempt]);
      }
    }
  }

  /**
   * Emit an AI stream event only while the run is still active.
   *
   * Why: cancel/timeout MUST stop further deltas to keep the UI stable.
   */
  function emitIfActive(entry: RunEntry, event: AiStreamEvent): void {
    if (entry.terminal !== null && event.type === "chunk") {
      return;
    }
    entry.emitEvent(event);
  }

  /**
   * Emit a single stream chunk in-order for the given execution.
   */
  function emitChunk(entry: RunEntry, chunk: string): void {
    if (entry.terminal !== null || chunk.length === 0) {
      return;
    }

    entry.seq += 1;
    entry.outputText = `${entry.outputText}${chunk}`;

    emitIfActive(entry, {
      type: "chunk",
      executionId: entry.executionId,
      runId: entry.runId,
      traceId: entry.traceId,
      seq: entry.seq,
      chunk,
      ts: Date.now(),
    });
  }

  /**
   * Emit the done terminal event once.
   */
  function emitDone(args: {
    entry: RunEntry;
    terminal: AiStreamTerminal;
    error?: IpcError;
    ts?: number;
  }): void {
    const entry = args.entry;
    if (entry.doneEmitted) {
      return;
    }
    entry.doneEmitted = true;

    emitIfActive(entry, {
      type: "done",
      executionId: entry.executionId,
      runId: entry.runId,
      traceId: entry.traceId,
      terminal: args.terminal,
      outputText: entry.outputText,
      ...(args.error ? { error: args.error } : {}),
      ts: args.ts ?? Date.now(),
    });
  }

  function resolveSchedulerTerminal(
    entry: RunEntry,
    terminal: SkillSchedulerTerminal,
  ): void {
    if (entry.schedulerTerminalResolved) {
      return;
    }
    entry.schedulerTerminalResolved = true;
    entry.resolveSchedulerTerminal(terminal);
  }

  /**
   * Mark a run terminal and collapse lifecycle with a single done event.
   */
  function setTerminal(args: {
    entry: RunEntry;
    terminal: AiStreamTerminal;
    logEvent:
      | "ai_run_completed"
      | "ai_run_failed"
      | "ai_run_canceled"
      | "ai_run_timeout";
    errorCode?: IpcErrorCode;
    error?: IpcError;
    ts?: number;
  }): void {
    const entry = args.entry;
    if (entry.terminal === "cancelled" && args.terminal !== "cancelled") {
      return;
    }
    if (entry.terminal !== null && args.terminal !== "cancelled") {
      return;
    }

    entry.terminal = args.terminal;
    emitDone({
      entry,
      terminal: args.terminal,
      error: args.error,
      ts: args.ts,
    });
    deps.logger.info(args.logEvent, {
      runId: entry.runId,
      executionId: entry.executionId,
      code: args.errorCode,
    });
    resolveSchedulerTerminal(
      entry,
      args.terminal === "completed"
        ? "completed"
        : args.terminal === "cancelled"
          ? "cancelled"
          : args.errorCode === "SKILL_TIMEOUT" ||
              args.error?.code === "SKILL_TIMEOUT"
            ? "timeout"
            : "failed",
    );
    cleanupRun(entry.runId);
  }

  /**
   * Cleanup run resources.
   */
  function cleanupRun(runId: string): void {
    const entry = runs.get(runId);
    if (!entry) {
      return;
    }
    if (entry.timeoutTimer) {
      clearTimeout(entry.timeoutTimer);
    }
    if (entry.completionTimer) {
      clearTimeout(entry.completionTimer);
    }
    runs.delete(runId);
  }

  function normalizeSkillError(error: IpcError): IpcError {
    if (error.code !== "TIMEOUT") {
      return error;
    }
    return {
      ...error,
      code: "SKILL_TIMEOUT",
      message: "Skill execution timed out",
    };
  }

  /**
   * Reset stream sequence/output before replaying the full prompt.
   */
  function resetForFullPromptReplay(entry: RunEntry): void {
    entry.seq = 0;
    entry.outputText = "";
  }

  /**
   * Identify replayable stream disconnect errors.
   */
  function isReplayableStreamDisconnect(error: IpcError): boolean {
    const details = asObject(error.details);
    return (
      error.code === "LLM_API_ERROR" &&
      details?.reason === "STREAM_DISCONNECTED"
    );
  }

  /**
   * Execute a non-stream OpenAI-compatible request.
   */
  async function runOpenAiNonStream(args: {
    entry: RunEntry;
    cfg: ProviderConfig;
    systemPrompt?: string;
    input: string;
    mode: "agent" | "plan" | "ask";
    model: string;
    system?: string;
  }): Promise<ServiceResult<string>> {
    const url = buildApiUrl({
      baseUrl: args.cfg.baseUrl,
      endpointPath: "/v1/chat/completions",
    });

    const systemText = combineSystemText({
      systemPrompt: args.systemPrompt,
      system: [args.system ?? "", modeSystemHint(args.mode) ?? ""]
        .filter((part) => part.trim().length > 0)
        .join("\n\n"),
    });
    const messages = systemText
      ? [
          { role: "system", content: systemText },
          { role: "user", content: args.input },
        ]
      : [{ role: "user", content: args.input }];

    const fetchRes = await fetchWithPolicy({
      url,
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(args.cfg.apiKey
            ? { Authorization: `Bearer ${args.cfg.apiKey}` }
            : {}),
        },
        body: JSON.stringify({
          model: args.model,
          messages,
          stream: false,
        }),
        signal: args.entry.controller.signal,
      },
    });
    if (!fetchRes.ok) {
      return fetchRes;
    }
    const res = fetchRes.data;

    if (!res.ok) {
      const mapped = await buildUpstreamHttpError({
        res,
        fallbackMessage: "AI upstream request failed",
      });
      return {
        ok: false,
        error: mapped,
      };
    }

    const jsonRes = await parseJsonResponse(res);
    if (!jsonRes.ok) {
      return jsonRes;
    }
    const json = jsonRes.data;
    const text = extractOpenAiText(json);
    if (typeof text !== "string") {
      return ipcError("INTERNAL", "Invalid OpenAI response shape");
    }
    return { ok: true, data: text };
  }

  /**
   * Execute a non-stream Anthropic request.
   */
  async function runAnthropicNonStream(args: {
    entry: RunEntry;
    cfg: ProviderConfig;
    systemPrompt?: string;
    input: string;
    mode: "agent" | "plan" | "ask";
    model: string;
    system?: string;
  }): Promise<ServiceResult<string>> {
    const url = buildApiUrl({
      baseUrl: args.cfg.baseUrl,
      endpointPath: "/v1/messages",
    });

    const systemText = combineSystemText({
      systemPrompt: args.systemPrompt,
      system: [args.system ?? "", modeSystemHint(args.mode) ?? ""]
        .filter((part) => part.trim().length > 0)
        .join("\n\n"),
    });

    const fetchRes = await fetchWithPolicy({
      url,
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          ...(args.cfg.apiKey ? { "x-api-key": args.cfg.apiKey } : {}),
        },
        body: JSON.stringify({
          model: args.model,
          max_tokens: 256,
          ...(systemText ? { system: systemText } : {}),
          messages: [{ role: "user", content: args.input }],
          stream: false,
        }),
        signal: args.entry.controller.signal,
      },
    });
    if (!fetchRes.ok) {
      return fetchRes;
    }
    const res = fetchRes.data;

    if (!res.ok) {
      const mapped = await buildUpstreamHttpError({
        res,
        fallbackMessage: "AI upstream request failed",
      });
      return {
        ok: false,
        error: mapped,
      };
    }

    const jsonRes = await parseJsonResponse(res);
    if (!jsonRes.ok) {
      return jsonRes;
    }
    const json = jsonRes.data;
    const text = extractAnthropicText(json);
    if (typeof text !== "string") {
      return ipcError("INTERNAL", "Invalid Anthropic response shape");
    }
    return { ok: true, data: text };
  }

  /**
   * Execute a streaming OpenAI-compatible request and emit delta events.
   */
  async function runOpenAiStream(args: {
    entry: RunEntry;
    cfg: ProviderConfig;
    systemPrompt?: string;
    input: string;
    mode: "agent" | "plan" | "ask";
    model: string;
    system?: string;
  }): Promise<ServiceResult<true>> {
    const url = buildApiUrl({
      baseUrl: args.cfg.baseUrl,
      endpointPath: "/v1/chat/completions",
    });

    const systemText = combineSystemText({
      systemPrompt: args.systemPrompt,
      system: [args.system ?? "", modeSystemHint(args.mode) ?? ""]
        .filter((part) => part.trim().length > 0)
        .join("\n\n"),
    });
    const messages = systemText
      ? [
          { role: "system", content: systemText },
          { role: "user", content: args.input },
        ]
      : [{ role: "user", content: args.input }];

    const fetchRes = await fetchWithPolicy({
      url,
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(args.cfg.apiKey
            ? { Authorization: `Bearer ${args.cfg.apiKey}` }
            : {}),
        },
        body: JSON.stringify({
          model: args.model,
          messages,
          stream: true,
        }),
        signal: args.entry.controller.signal,
      },
    });
    if (!fetchRes.ok) {
      return fetchRes;
    }
    const res = fetchRes.data;

    if (!res.ok) {
      const mapped = await buildUpstreamHttpError({
        res,
        fallbackMessage: "AI upstream request failed",
      });
      return {
        ok: false,
        error: mapped,
      };
    }

    if (!res.body) {
      return ipcError("INTERNAL", "Missing streaming response body");
    }

    let sawDone = false;
    try {
      for await (const msg of readSse({ body: res.body })) {
        if (args.entry.terminal !== null) {
          break;
        }
        if (msg.data === "[DONE]") {
          sawDone = true;
          break;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(msg.data);
        } catch {
          continue;
        }
        const delta = extractOpenAiDelta(parsed);
        if (typeof delta !== "string" || delta.length === 0) {
          continue;
        }

        emitChunk(args.entry, delta);
      }
    } catch (error) {
      if (args.entry.controller.signal.aborted) {
        return ipcError("CANCELED", "AI request canceled");
      }
      return ipcError("LLM_API_ERROR", "Streaming connection interrupted", {
        reason: "STREAM_DISCONNECTED",
        retryable: true,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    if (args.entry.controller.signal.aborted) {
      return ipcError("CANCELED", "AI request canceled");
    }
    if (args.entry.terminal === null && !sawDone) {
      return ipcError("LLM_API_ERROR", "Streaming connection interrupted", {
        reason: "STREAM_DISCONNECTED",
        retryable: true,
      });
    }

    return { ok: true, data: true };
  }

  /**
   * Execute a streaming Anthropic request and emit delta events.
   */
  async function runAnthropicStream(args: {
    entry: RunEntry;
    cfg: ProviderConfig;
    systemPrompt?: string;
    input: string;
    mode: "agent" | "plan" | "ask";
    model: string;
    system?: string;
  }): Promise<ServiceResult<true>> {
    const url = buildApiUrl({
      baseUrl: args.cfg.baseUrl,
      endpointPath: "/v1/messages",
    });

    const systemText = combineSystemText({
      systemPrompt: args.systemPrompt,
      system: [args.system ?? "", modeSystemHint(args.mode) ?? ""]
        .filter((part) => part.trim().length > 0)
        .join("\n\n"),
    });

    const fetchRes = await fetchWithPolicy({
      url,
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          ...(args.cfg.apiKey ? { "x-api-key": args.cfg.apiKey } : {}),
        },
        body: JSON.stringify({
          model: args.model,
          max_tokens: 256,
          ...(systemText ? { system: systemText } : {}),
          messages: [{ role: "user", content: args.input }],
          stream: true,
        }),
        signal: args.entry.controller.signal,
      },
    });
    if (!fetchRes.ok) {
      return fetchRes;
    }
    const res = fetchRes.data;

    if (!res.ok) {
      const mapped = await buildUpstreamHttpError({
        res,
        fallbackMessage: "AI upstream request failed",
      });
      return {
        ok: false,
        error: mapped,
      };
    }

    if (!res.body) {
      return ipcError("INTERNAL", "Missing streaming response body");
    }

    let sawMessageStop = false;
    try {
      for await (const msg of readSse({ body: res.body })) {
        if (args.entry.terminal !== null) {
          break;
        }

        if (msg.event === "message_stop") {
          sawMessageStop = true;
          break;
        }

        if (msg.event !== "content_block_delta") {
          continue;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(msg.data);
        } catch {
          continue;
        }
        const delta = extractAnthropicDelta(parsed);
        if (typeof delta !== "string" || delta.length === 0) {
          continue;
        }

        emitChunk(args.entry, delta);
      }
    } catch (error) {
      if (args.entry.controller.signal.aborted) {
        return ipcError("CANCELED", "AI request canceled");
      }
      return ipcError("LLM_API_ERROR", "Streaming connection interrupted", {
        reason: "STREAM_DISCONNECTED",
        retryable: true,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    if (args.entry.controller.signal.aborted) {
      return ipcError("CANCELED", "AI request canceled");
    }
    if (args.entry.terminal === null && !sawMessageStop) {
      return ipcError("LLM_API_ERROR", "Streaming connection interrupted", {
        reason: "STREAM_DISCONNECTED",
        retryable: true,
      });
    }

    return { ok: true, data: true };
  }

  async function runNonStreamWithProvider(args: {
    entry: RunEntry;
    cfg: ProviderConfig;
    systemPrompt?: string;
    input: string;
    mode: "agent" | "plan" | "ask";
    model: string;
    system?: string;
  }): Promise<ServiceResult<string>> {
    if (args.cfg.provider === "anthropic") {
      return await runAnthropicNonStream(args);
    }
    return await runOpenAiNonStream(args);
  }

  async function runNonStreamWithFailover(args: {
    entry: RunEntry;
    primary: ProviderConfig;
    backup: ProviderConfig | null;
    systemPrompt?: string;
    input: string;
    mode: "agent" | "plan" | "ask";
    model: string;
    system?: string;
  }): Promise<ServiceResult<string>> {
    const primaryState = getProviderHealthState(args.primary);
    const canHalfOpenProbe =
      primaryState.status === "degraded" &&
      primaryState.degradedAtMs !== null &&
      now() - primaryState.degradedAtMs >= PROVIDER_HALF_OPEN_AFTER_MS;

    if (
      primaryState.status === "degraded" &&
      !canHalfOpenProbe &&
      args.backup !== null
    ) {
      deps.logger.info("ai_provider_failover", {
        traceId: args.entry.traceId,
        from: args.primary.provider,
        to: args.backup.provider,
        reason: "primary_degraded",
      });
      const backupRes = await runNonStreamWithProvider({
        ...args,
        cfg: args.backup,
      });
      if (backupRes.ok) {
        return backupRes;
      }
      if (isProviderAvailabilityError(backupRes.error)) {
        return buildProviderUnavailableError({
          traceId: args.entry.traceId,
          primary: args.primary,
          backup: args.backup,
        });
      }
      return backupRes;
    }

    if (canHalfOpenProbe) {
      deps.logger.info("ai_provider_half_open_probe", {
        traceId: args.entry.traceId,
        provider: args.primary.provider,
      });
    }

    const primaryRes = await runNonStreamWithProvider({
      ...args,
      cfg: args.primary,
    });
    if (primaryRes.ok) {
      markProviderSuccess({
        cfg: args.primary,
        traceId: args.entry.traceId,
        fromHalfOpen: canHalfOpenProbe,
      });
      return primaryRes;
    }

    if (!isProviderAvailabilityError(primaryRes.error)) {
      return primaryRes;
    }

    const state = markProviderFailure({
      cfg: args.primary,
      traceId: args.entry.traceId,
      reason: primaryRes.error.code,
    });

    if (state.status !== "degraded") {
      if (args.backup !== null) {
        return buildProviderUnavailableError({
          traceId: args.entry.traceId,
          primary: args.primary,
          backup: args.backup,
        });
      }
      return primaryRes;
    }

    if (args.backup === null) {
      return primaryRes;
    }

    deps.logger.info("ai_provider_failover", {
      traceId: args.entry.traceId,
      from: args.primary.provider,
      to: args.backup.provider,
      reason: canHalfOpenProbe
        ? "half_open_probe_failed"
        : "primary_unavailable",
    });

    const backupRes = await runNonStreamWithProvider({
      ...args,
      cfg: args.backup,
    });
    if (backupRes.ok) {
      return backupRes;
    }
    if (isProviderAvailabilityError(backupRes.error)) {
      return buildProviderUnavailableError({
        traceId: args.entry.traceId,
        primary: args.primary,
        backup: args.backup,
      });
    }

    return backupRes;
  }

  const runSkill: AiService["runSkill"] = async (args) => {
    const cfgRes = await resolveProviderConfig({
      logger: deps.logger,
      env: deps.env,
      getFakeServer,
      getProxySettings: deps.getProxySettings,
    });
    if (!cfgRes.ok) {
      return cfgRes;
    }
    const primaryCfg = cfgRes.data.primary;
    const backupCfg = cfgRes.data.backup;

    const runId = randomUUID();
    const executionId = runId;
    const traceId = randomUUID();
    const controller = new AbortController();
    const sessionKey = resolveSessionKey(args.context);
    const promptTokens = estimateTokenCount(args.input);
    const projectedTokens = promptTokens + DEFAULT_REQUEST_MAX_TOKENS_ESTIMATE;
    const skillTimeoutMs = resolveSkillTimeoutMs(args.timeoutMs);
    let resolveCompletion: (terminal: SkillSchedulerTerminal) => void = () =>
      undefined;
    const completionPromise = new Promise<SkillSchedulerTerminal>((resolve) => {
      resolveCompletion = resolve;
    });
    const entry: RunEntry = {
      executionId,
      runId,
      traceId,
      controller,
      timeoutTimer: null,
      completionTimer: null,
      stream: args.stream,
      startedAt: args.ts,
      terminal: null,
      doneEmitted: false,
      schedulerTerminalResolved: false,
      resolveSchedulerTerminal: resolveCompletion,
      seq: 0,
      outputText: "",
      emitEvent: args.emitEvent,
    };
    runs.set(runId, entry);

    deps.logger.info("ai_run_started", {
      runId,
      executionId,
      traceId,
      provider: primaryCfg.provider,
      stream: args.stream,
      timeoutMs: skillTimeoutMs,
    });

    const consumeSessionTokenBudget = (): Err | null => {
      const currentTotal = sessionTokenTotalsByKey.get(sessionKey) ?? 0;
      if (currentTotal + projectedTokens > sessionTokenBudget) {
        return ipcError(
          "AI_SESSION_TOKEN_BUDGET_EXCEEDED",
          "AI session token budget exceeded",
          {
            traceId,
            sessionKey,
            sessionTokenBudget,
            currentTotal,
            projectedTokens,
          },
        );
      }
      return null;
    };

    function armSkillTimeout(): void {
      if (entry.timeoutTimer) {
        clearTimeout(entry.timeoutTimer);
      }
      entry.timeoutTimer = setTimeout(() => {
        if (entry.terminal !== null) {
          return;
        }
        controller.abort();

        setTerminal({
          entry,
          terminal: "error",
          error: {
            code: "SKILL_TIMEOUT",
            message: "Skill execution timed out",
          },
          logEvent: "ai_run_timeout",
          errorCode: "SKILL_TIMEOUT",
        });
      }, skillTimeoutMs);
    }

    const executeNonStream = async (): Promise<
      ServiceResult<{ executionId: string; runId: string; outputText?: string }>
    > => {
      try {
        const budgetExceeded = consumeSessionTokenBudget();
        if (budgetExceeded) {
          setTerminal({
            entry,
            terminal: "error",
            error: budgetExceeded.error,
            logEvent: "ai_run_failed",
            errorCode: budgetExceeded.error.code,
          });
          return budgetExceeded;
        }

        const currentTotal = sessionTokenTotalsByKey.get(sessionKey) ?? 0;
        const res = await runNonStreamWithFailover({
          entry,
          primary: primaryCfg,
          backup: backupCfg,
          systemPrompt: args.systemPrompt,
          input: args.input,
          mode: args.mode,
          model: args.model,
          system: args.system,
        });

        if (!res.ok) {
          const normalizedError = normalizeSkillError(res.error);
          setTerminal({
            entry,
            terminal: "error",
            error: normalizedError,
            logEvent: "ai_run_failed",
            errorCode: normalizedError.code,
          });
          return { ok: false, error: normalizedError };
        }

        entry.outputText = res.data;
        const completionTokens = estimateTokenCount(res.data);
        sessionTokenTotalsByKey.set(
          sessionKey,
          currentTotal + promptTokens + completionTokens,
        );

        setTerminal({
          entry,
          terminal: "completed",
          logEvent: "ai_run_completed",
        });
        return { ok: true, data: { executionId, runId, outputText: res.data } };
      } catch (error) {
        const aborted = controller.signal.aborted;
        if (aborted) {
          if (entry.terminal === "error") {
            return ipcError("SKILL_TIMEOUT", "Skill execution timed out");
          }
          setTerminal({
            entry,
            terminal: "cancelled",
            logEvent: "ai_run_canceled",
            errorCode: "CANCELED",
          });
          return ipcError("CANCELED", "AI request canceled");
        }

        setTerminal({
          entry,
          terminal: "error",
          error: {
            code: "INTERNAL",
            message: "AI request failed",
            details: {
              message: error instanceof Error ? error.message : String(error),
            },
          },
          logEvent: "ai_run_failed",
          errorCode: "INTERNAL",
        });
        return ipcError("INTERNAL", "AI request failed");
      } finally {
        cleanupRun(runId);
      }
    };

    const scheduled = await skillScheduler.schedule({
      sessionKey,
      executionId,
      runId,
      traceId,
      onQueueEvent: (queueState) => {
        args.emitEvent({
          type: "queue",
          executionId,
          runId,
          traceId,
          status: queueState.status,
          queuePosition: queueState.queuePosition,
          queued: queueState.queued,
          globalRunning: queueState.globalRunning,
          ts: now(),
        });
      },
      start: () => {
        armSkillTimeout();
        if (args.stream) {
          const budgetExceeded = consumeSessionTokenBudget();
          if (budgetExceeded) {
            setTerminal({
              entry,
              terminal: "error",
              error: budgetExceeded.error,
              logEvent: "ai_run_failed",
              errorCode: budgetExceeded.error.code,
            });
            return {
              response: Promise.resolve(
                budgetExceeded as ServiceResult<{
                  executionId: string;
                  runId: string;
                  outputText?: string;
                }>,
              ),
              completion: completionPromise,
            };
          }

          void (async () => {
            try {
              let replayAttempts = 0;
              for (;;) {
                const res =
                  primaryCfg.provider === "anthropic"
                    ? await runAnthropicStream({
                        entry,
                        cfg: primaryCfg,
                        systemPrompt: args.systemPrompt,
                        input: args.input,
                        mode: args.mode,
                        model: args.model,
                        system: args.system,
                      })
                    : await runOpenAiStream({
                        entry,
                        cfg: primaryCfg,
                        systemPrompt: args.systemPrompt,
                        input: args.input,
                        mode: args.mode,
                        model: args.model,
                        system: args.system,
                      });

                if (res.ok) {
                  break;
                }

                if (entry.terminal !== null) {
                  return;
                }

                const normalizedError = normalizeSkillError(res.error);
                if (
                  !isReplayableStreamDisconnect(normalizedError) ||
                  replayAttempts >= 1
                ) {
                  setTerminal({
                    entry,
                    terminal:
                      normalizedError.code === "CANCELED"
                        ? "cancelled"
                        : "error",
                    error: normalizedError,
                    logEvent:
                      normalizedError.code === "SKILL_TIMEOUT"
                        ? "ai_run_timeout"
                        : normalizedError.code === "CANCELED"
                          ? "ai_run_canceled"
                          : "ai_run_failed",
                    errorCode: normalizedError.code,
                  });
                  return;
                }

                replayAttempts += 1;
                resetForFullPromptReplay(entry);
                deps.logger.info("ai_stream_replay_retry", {
                  runId,
                  executionId,
                  traceId,
                  attempt: replayAttempts,
                });

                const waitMs =
                  retryBackoffMs[
                    Math.min(replayAttempts - 1, retryBackoffMs.length - 1)
                  ] ?? 0;
                if (waitMs > 0) {
                  await sleep(waitMs);
                }
              }

              if (entry.terminal !== null) {
                return;
              }

              if (entry.completionTimer !== null) {
                return;
              }

              // Completion is deferred one tick so a near-simultaneous cancel can win.
              entry.completionTimer = setTimeout(() => {
                entry.completionTimer = null;
                if (entry.terminal !== null) {
                  return;
                }

                const currentTotal =
                  sessionTokenTotalsByKey.get(sessionKey) ?? 0;
                const completionTokens = estimateTokenCount(entry.outputText);
                sessionTokenTotalsByKey.set(
                  sessionKey,
                  currentTotal + promptTokens + completionTokens,
                );

                setTerminal({
                  entry,
                  terminal: "completed",
                  logEvent: "ai_run_completed",
                });
              }, 0);
            } catch (error) {
              if (entry.terminal !== null) {
                return;
              }

              const aborted = controller.signal.aborted;
              if (aborted) {
                setTerminal({
                  entry,
                  terminal: "cancelled",
                  logEvent: "ai_run_canceled",
                  errorCode: "CANCELED",
                });
                return;
              }

              setTerminal({
                entry,
                terminal: "error",
                error: {
                  code: "INTERNAL",
                  message: "AI request failed",
                  details: {
                    message:
                      error instanceof Error ? error.message : String(error),
                  },
                },
                logEvent: "ai_run_failed",
                errorCode: "INTERNAL",
              });
            }
          })();

          return {
            response: Promise.resolve({
              ok: true,
              data: { executionId, runId },
            }),
            completion: completionPromise,
          };
        }

        return {
          response: executeNonStream(),
          completion: completionPromise,
        };
      },
    });

    if (!scheduled.ok) {
      resolveSchedulerTerminal(entry, "failed");
      cleanupRun(runId);
      return scheduled;
    }

    return scheduled;
  };

  const listModels: AiService["listModels"] = async () => {
    const cfgRes = await resolveProviderConfig({
      logger: deps.logger,
      env: deps.env,
      getFakeServer,
      getProxySettings: deps.getProxySettings,
    });
    if (!cfgRes.ok) {
      return cfgRes;
    }

    const cfg = cfgRes.data.primary;
    const provider = cfg.provider;
    const providerName = providerDisplayName(provider);

    const url = buildApiUrl({
      baseUrl: cfg.baseUrl,
      endpointPath: "/v1/models",
    });
    const fetchRes = await fetchWithPolicy({
      url,
      init: {
        method: "GET",
        headers: {
          ...(cfg.apiKey
            ? provider === "anthropic"
              ? {
                  "x-api-key": cfg.apiKey,
                  "anthropic-version": "2023-06-01",
                }
              : { Authorization: `Bearer ${cfg.apiKey}` }
            : {}),
        },
      },
    });
    if (!fetchRes.ok) {
      return fetchRes;
    }
    const res = fetchRes.data;

    if (!res.ok) {
      const mapped = await buildUpstreamHttpError({
        res,
        fallbackMessage: "AI model catalog request failed",
      });
      return {
        ok: false,
        error: mapped,
      };
    }

    const jsonRes = await parseJsonResponse(res);
    if (!jsonRes.ok) {
      return jsonRes;
    }
    const json = jsonRes.data;
    const items = extractOpenAiModels(json).map((item) => ({
      id: item.id,
      name: item.name,
      provider: providerName,
    }));

    return {
      ok: true,
      data: {
        source: provider,
        items,
      },
    };
  };
  const cancel: AiService["cancel"] = (args) => {
    const executionId = (args.executionId ?? args.runId ?? "").trim();
    if (executionId.length === 0) {
      return ipcError("INVALID_ARGUMENT", "executionId is required");
    }

    const entry = runs.get(executionId);
    if (!entry) {
      return { ok: true, data: { canceled: true } };
    }

    if (entry.terminal !== null) {
      return { ok: true, data: { canceled: true } };
    }

    entry.controller.abort();
    setTerminal({
      entry,
      terminal: "cancelled",
      logEvent: "ai_run_canceled",
      errorCode: "CANCELED",
      ts: args.ts,
    });

    return { ok: true, data: { canceled: true } };
  };

  const feedback: AiService["feedback"] = (args) => {
    deps.logger.info("ai_feedback_received", {
      runId: args.runId,
      action: args.action,
      evidenceRefLen: args.evidenceRef.trim().length,
    });
    return { ok: true, data: { recorded: true } };
  };

  return { runSkill, listModels, cancel, feedback };
}
