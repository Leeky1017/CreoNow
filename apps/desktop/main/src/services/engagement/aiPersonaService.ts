/**
 * @module aiPersonaService
 * ## Responsibilities: Build the L0 persona memory overlay for AI system prompts.
 * ## Does not do: LLM calls, IPC registration, UI state management.
 * ## Dependency direction: optional settings read from SQLite only.
 * ## Invariants: INV-4 (Memory-first prompt augmentation, structured and deterministic).
 */

import type { DbLike } from "./dbTypes";

const SETTINGS_SCOPE = "app";
const HUMOR_SETTING_KEY = "ai.persona.humor";

type SettingsRow = { valueJson: string };

export type AiPersonaConfig = {
  humorEnabled: boolean;
};

export type AiPersonaService = {
  getConfig: () => AiPersonaConfig;
  buildMemoryOverlay: () => string;
};

export type AiPersonaServiceDeps = {
  db?: DbLike | null;
};

const DEFAULT_CONFIG: AiPersonaConfig = {
  humorEnabled: true,
};

const PERSONA_BLOCK_NEVER = [
  "使用\"请问您需要什么\"式服务员语气",
  "无条件赞美用户的每一个决策",
  "假装对不在 KG 中的信息了如指掌",
] as const;

function readSettingValue(args: {
  db: DbLike | null | undefined;
  key: string;
}): unknown {
  if (!args.db) {
    return null;
  }
  const row = args.db
    .prepare(
      "SELECT value_json AS valueJson FROM settings WHERE scope = ? AND key = ?",
    )
    .get(SETTINGS_SCOPE, args.key) as SettingsRow | undefined;
  if (!row) {
    return null;
  }
  try {
    return JSON.parse(row.valueJson) as unknown;
  } catch {
    return null;
  }
}

function readBooleanSetting(args: {
  db: DbLike | null | undefined;
  key: string;
  fallback: boolean;
}): boolean {
  const value = readSettingValue({
    db: args.db,
    key: args.key,
  });
  return typeof value === "boolean" ? value : args.fallback;
}

function renderPersonaNeverList(): string {
  return PERSONA_BLOCK_NEVER.map((item) => `  - ${item}`).join("\n");
}

export function buildAiPersonaMemoryOverlay(config: AiPersonaConfig): string {
  const humorInstruction = config.humorEnabled
    ? "enabled：仅在高强度创作条件命中时，于主回答末尾增加一行轻松旁注（不打断主内容）"
    : "disabled：不输出任何幽默旁注，保持协作语气";
  const humorSwitch = config.humorEnabled ? "enabled" : "disabled";

  return [
    "[AI 人格模板 · Memory L0]",
    "persona_template:",
    "  tone: collaborative  # 优先使用“我们”协作推进",
    "  assertiveness: moderate  # 有观点但不强硬",
    "  humility: high  # 不确定时主动标记边界",
    `  humor: contextual  # ${humorInstruction}`,
    `  humor_switch: ${humorSwitch}`,
    "  never:",
    renderPersonaNeverList(),
    "",
    "执行约束：",
    "- 回应定位为创作搭档，不使用客服语体。",
    "- 当把握不足时明确表达不确定，不伪造事实。",
  ].join("\n");
}

export function createAiPersonaService(
  deps: AiPersonaServiceDeps,
): AiPersonaService {
  const db = deps.db ?? null;

  function getConfig(): AiPersonaConfig {
    return {
      humorEnabled: readBooleanSetting({
        db,
        key: HUMOR_SETTING_KEY,
        fallback: DEFAULT_CONFIG.humorEnabled,
      }),
    };
  }

  function buildMemoryOverlay(): string {
    return buildAiPersonaMemoryOverlay(getConfig());
  }

  return {
    getConfig,
    buildMemoryOverlay,
  };
}
