import { assembleSystemPrompt } from "./assembleSystemPrompt";
import { GLOBAL_IDENTITY_PROMPT } from "./identityPrompt";

export const DEFAULT_SKILL_TIMEOUT_MS = 30_000;
const MAX_SKILL_TIMEOUT_MS = 120_000;
export const DEFAULT_REQUEST_MAX_TOKENS_ESTIMATE = 256;
const DEFAULT_MAX_SKILL_OUTPUT_CHARS = 120_000;
const DEFAULT_CHAT_HISTORY_TOKEN_BUDGET = 16_000;

export function combineSystemText(args: {
  systemPrompt?: string;
  system?: string;
  modeHint?: string;
}): string {
  return assembleSystemPrompt({
    globalIdentity: GLOBAL_IDENTITY_PROMPT,
    skillSystemPrompt: args.systemPrompt,
    modeHint: args.modeHint,
    contextOverlay: args.system,
  });
}

export function modeSystemHint(mode: "agent" | "plan" | "ask"): string | null {
  if (mode === "plan") {
    return "Mode: plan\nFirst produce a concise step-by-step plan before final output.";
  }
  if (mode === "agent") {
    return "Mode: agent\nAct as an autonomous writing assistant and make concrete edits.";
  }
  return null;
}

export function estimateTokenCount(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(Buffer.byteLength(text, "utf8") / 4));
}

export function parseMaxSkillOutputChars(env: NodeJS.ProcessEnv): number {
  const raw = env.CREONOW_AI_MAX_SKILL_OUTPUT_CHARS;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return DEFAULT_MAX_SKILL_OUTPUT_CHARS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_SKILL_OUTPUT_CHARS;
  }
  return parsed;
}

export function parseChatHistoryTokenBudget(env: NodeJS.ProcessEnv): number {
  const raw = env.CREONOW_AI_CHAT_HISTORY_TOKEN_BUDGET;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return DEFAULT_CHAT_HISTORY_TOKEN_BUDGET;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_CHAT_HISTORY_TOKEN_BUDGET;
  }
  return parsed;
}

export function resolveSkillTimeoutMs(args: {
  timeoutMs: number | undefined;
  fallbackEnvTimeoutMs?: number;
}): number {
  const normalize = (value: number | undefined): number | null => {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      !Number.isInteger(value) ||
      value <= 0
    ) {
      return null;
    }
    return Math.min(value, MAX_SKILL_TIMEOUT_MS);
  };

  const explicit = normalize(args.timeoutMs);
  if (explicit !== null) {
    return explicit;
  }

  const envFallback = normalize(args.fallbackEnvTimeoutMs);
  if (envFallback !== null) {
    return envFallback;
  }

  return DEFAULT_SKILL_TIMEOUT_MS;
}
