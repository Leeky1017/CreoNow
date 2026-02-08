import { randomUUID } from "node:crypto";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { AiStreamEvent } from "../../../../../../packages/shared/types/ai";
import type { Logger } from "../../logging/logger";
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
    mode: "agent" | "plan" | "ask";
    model: string;
    system?: string;
    context?: { projectId?: string; documentId?: string };
    stream: boolean;
    ts: number;
    emitEvent: (event: AiStreamEvent) => void;
  }) => Promise<ServiceResult<{ runId: string; outputText?: string }>>;
  listModels: () => Promise<
    ServiceResult<{
      source: "proxy" | "openai" | "anthropic";
      items: Array<{ id: string; name: string; provider: string }>;
    }>
  >;
  cancel: (args: { runId: string; ts: number }) => ServiceResult<{
    canceled: true;
  }>;
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

type RunEntry = {
  runId: string;
  controller: AbortController;
  timeoutTimer: NodeJS.Timeout | null;
  stream: boolean;
  startedAt: number;
  terminal: "completed" | "failed" | "canceled" | null;
  emitEvent: (event: AiStreamEvent) => void;
};

const DEFAULT_TIMEOUT_MS = 10_000;

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
async function parseJsonResponse(res: Response): Promise<ServiceResult<unknown>> {
  const bodyText = await res.text();
  try {
    return { ok: true, data: JSON.parse(bodyText) as unknown };
  } catch {
    return ipcError("UPSTREAM_ERROR", "Non-JSON upstream response");
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
}): { provider: AiProvider; credentials: ProviderCredentials; mode: ProviderMode } {
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
function extractOpenAiModels(json: unknown): Array<{ id: string; name: string }> {
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
 * Why: tests and UI assertions rely on stable semantics (401/403 → PERMISSION_DENIED,
 * 429 → RATE_LIMITED) while keeping other upstream failures grouped as UPSTREAM_ERROR.
 */
export function mapUpstreamStatusToIpcErrorCode(status: number): IpcErrorCode {
  if (status === 401 || status === 403) {
    return "PERMISSION_DENIED";
  }
  if (status === 429) {
    return "RATE_LIMITED";
  }
  return "UPSTREAM_ERROR";
}

function upstreamError(args: { status: number; message: string }): IpcError {
  const code = mapUpstreamStatusToIpcErrorCode(args.status);
  const message =
    code === "PERMISSION_DENIED"
      ? "AI upstream unauthorized"
      : code === "RATE_LIMITED"
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
      if (typeof nestedMessage === "string" && nestedMessage.trim().length > 0) {
        return nestedMessage.trim();
      }
      const directMessage = obj?.message;
      if (typeof directMessage === "string" && directMessage.trim().length > 0) {
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
}): Promise<ServiceResult<ProviderConfig>> {
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
        provider: "proxy",
        baseUrl,
        apiKey:
          typeof deps.env.CREONOW_AI_PROXY_API_KEY === "string" &&
          deps.env.CREONOW_AI_PROXY_API_KEY.length > 0
            ? deps.env.CREONOW_AI_PROXY_API_KEY
            : undefined,
        timeoutMs,
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
      const baseUrl =
        typeof resolved.credentials.baseUrl === "string"
          ? resolved.credentials.baseUrl.trim()
          : "";
      if (baseUrl.length === 0) {
        return ipcError(
          "INVALID_ARGUMENT",
          `${mode} baseUrl is required in settings`,
        );
      }

      const apiKey =
        typeof resolved.credentials.apiKey === "string" &&
        resolved.credentials.apiKey.trim().length > 0
          ? resolved.credentials.apiKey
          : undefined;

      if (resolved.provider !== "proxy" && !isE2E(deps.env) && !apiKey) {
        return ipcError(
          "INVALID_ARGUMENT",
          `${mode} api key is required in settings`,
        );
      }

      return {
        ok: true,
        data: {
          provider: resolved.provider,
          baseUrl,
          apiKey,
          timeoutMs,
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
    return ipcError(
      "INVALID_ARGUMENT",
      "api key is required when proxy disabled (CREONOW_AI_API_KEY)",
    );
  }

  return {
    ok: true,
    data: {
      provider,
      baseUrl,
      apiKey,
      timeoutMs,
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
}): AiService {
  const runs = new Map<string, RunEntry>();
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
   * Emit an AI stream event only while the run is still active.
   *
   * Why: cancel/timeout MUST stop further deltas to keep the UI stable.
   */
  function emitIfActive(entry: RunEntry, event: AiStreamEvent): void {
    if (entry.terminal !== null && event.type === "delta") {
      return;
    }
    entry.emitEvent(event);
  }

  /**
   * Mark a run as terminal and emit a single terminal event.
   */
  function setTerminal(args: {
    entry: RunEntry;
    event: AiStreamEvent;
    logEvent:
      | "ai_run_completed"
      | "ai_run_failed"
      | "ai_run_canceled"
      | "ai_run_timeout";
    errorCode?: IpcErrorCode;
  }): void {
    const entry = args.entry;
    if (entry.terminal !== null) {
      return;
    }

    if (args.event.type === "run_completed") {
      entry.terminal = "completed";
    } else if (args.event.type === "run_canceled") {
      entry.terminal = "canceled";
    } else {
      entry.terminal = "failed";
    }

    emitIfActive(entry, args.event);
    deps.logger.info(args.logEvent, {
      runId: entry.runId,
      code: args.errorCode,
    });
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
    runs.delete(runId);
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

    const res = await fetch(url, {
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
    });

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

    const res = await fetch(url, {
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
    });

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

    const res = await fetch(url, {
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
    });

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

    for await (const msg of readSse({ body: res.body })) {
      if (args.entry.terminal !== null) {
        break;
      }
      if (msg.data === "[DONE]") {
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

      emitIfActive(args.entry, {
        type: "delta",
        runId: args.entry.runId,
        ts: Date.now(),
        delta,
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

    const res = await fetch(url, {
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
    });

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

    for await (const msg of readSse({ body: res.body })) {
      if (args.entry.terminal !== null) {
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

      emitIfActive(args.entry, {
        type: "delta",
        runId: args.entry.runId,
        ts: Date.now(),
        delta,
      });
    }

    return { ok: true, data: true };
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
    const cfg = cfgRes.data;

    const runId = randomUUID();
    const controller = new AbortController();
    const entry: RunEntry = {
      runId,
      controller,
      timeoutTimer: null,
      stream: args.stream,
      startedAt: args.ts,
      terminal: null,
      emitEvent: args.emitEvent,
    };
    runs.set(runId, entry);

    deps.logger.info("ai_run_started", {
      runId,
      provider: cfg.provider,
      stream: args.stream,
    });

    emitIfActive(entry, { type: "run_started", runId, ts: args.ts });

    entry.timeoutTimer = setTimeout(() => {
      if (entry.terminal !== null) {
        return;
      }
      controller.abort();

      setTerminal({
        entry,
        event: {
          type: "run_failed",
          runId,
          ts: Date.now(),
          error: { code: "TIMEOUT", message: "AI request timed out" },
        },
        logEvent: "ai_run_timeout",
        errorCode: "TIMEOUT",
      });
      cleanupRun(runId);
    }, cfg.timeoutMs);

    if (args.stream) {
      void (async () => {
        try {
          const res =
            cfg.provider === "anthropic"
              ? await runAnthropicStream({
                  entry,
                  cfg,
                  systemPrompt: args.systemPrompt,
                  input: args.input,
                  mode: args.mode,
                  model: args.model,
                  system: args.system,
                })
              : await runOpenAiStream({
                  entry,
                  cfg,
                  systemPrompt: args.systemPrompt,
                  input: args.input,
                  mode: args.mode,
                  model: args.model,
                  system: args.system,
                });

          if (!res.ok) {
            setTerminal({
              entry,
              event: {
                type: "run_failed",
                runId,
                ts: Date.now(),
                error: res.error,
              },
              logEvent: "ai_run_failed",
              errorCode: res.error.code,
            });
            return;
          }

          if (entry.terminal !== null) {
            return;
          }

          setTerminal({
            entry,
            event: { type: "run_completed", runId, ts: Date.now() },
            logEvent: "ai_run_completed",
          });
        } catch (error) {
          if (entry.terminal !== null) {
            return;
          }

          const aborted = controller.signal.aborted;
          if (aborted) {
            setTerminal({
              entry,
              event: { type: "run_canceled", runId, ts: Date.now() },
              logEvent: "ai_run_canceled",
              errorCode: "CANCELED",
            });
            return;
          }

          setTerminal({
            entry,
            event: {
              type: "run_failed",
              runId,
              ts: Date.now(),
              error: {
                code: "INTERNAL",
                message: "AI request failed",
                details: {
                  message:
                    error instanceof Error ? error.message : String(error),
                },
              },
            },
            logEvent: "ai_run_failed",
            errorCode: "INTERNAL",
          });
        } finally {
          cleanupRun(runId);
        }
      })();

      return { ok: true, data: { runId } };
    }

    try {
      const res =
        cfg.provider === "anthropic"
          ? await runAnthropicNonStream({
              entry,
              cfg,
              systemPrompt: args.systemPrompt,
              input: args.input,
              mode: args.mode,
              model: args.model,
              system: args.system,
            })
          : await runOpenAiNonStream({
              entry,
              cfg,
              systemPrompt: args.systemPrompt,
              input: args.input,
              mode: args.mode,
              model: args.model,
              system: args.system,
            });

      if (!res.ok) {
        setTerminal({
          entry,
          event: {
            type: "run_failed",
            runId,
            ts: Date.now(),
            error: res.error,
          },
          logEvent: "ai_run_failed",
          errorCode: res.error.code,
        });
        return res;
      }

      setTerminal({
        entry,
        event: { type: "run_completed", runId, ts: Date.now() },
        logEvent: "ai_run_completed",
      });
      return { ok: true, data: { runId, outputText: res.data } };
    } catch (error) {
      const aborted = controller.signal.aborted;
      if (aborted) {
        if (entry.terminal === "failed") {
          return ipcError("TIMEOUT", "AI request timed out");
        }
        setTerminal({
          entry,
          event: { type: "run_canceled", runId, ts: Date.now() },
          logEvent: "ai_run_canceled",
          errorCode: "CANCELED",
        });
        return ipcError("CANCELED", "AI request canceled");
      }

      setTerminal({
        entry,
        event: {
          type: "run_failed",
          runId,
          ts: Date.now(),
          error: {
            code: "INTERNAL",
            message: "AI request failed",
            details: {
              message: error instanceof Error ? error.message : String(error),
            },
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

    const cfg = cfgRes.data;
    const provider = cfg.provider;
    const providerName = providerDisplayName(provider);

    const url = buildApiUrl({ baseUrl: cfg.baseUrl, endpointPath: "/v1/models" });
    try {
      const res = await fetch(url, {
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
      });

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
    } catch (error) {
      return ipcError(
        "UPSTREAM_ERROR",
        error instanceof Error
          ? error.message
          : "AI model catalog request failed",
      );
    }
  };
  const cancel: AiService["cancel"] = (args) => {
    const entry = runs.get(args.runId);
    if (!entry) {
      return { ok: true, data: { canceled: true } };
    }

    if (entry.terminal !== null) {
      return { ok: true, data: { canceled: true } };
    }

    entry.terminal = "canceled";
    if (entry.timeoutTimer) {
      clearTimeout(entry.timeoutTimer);
    }
    entry.controller.abort();

    emitIfActive(entry, {
      type: "run_canceled",
      runId: args.runId,
      ts: args.ts,
    });
    deps.logger.info("ai_run_canceled", { runId: args.runId });

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

