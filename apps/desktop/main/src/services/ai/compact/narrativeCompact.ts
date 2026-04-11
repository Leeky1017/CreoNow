/**
 * @module narrativeCompact
 * ## Responsibilities: narrative-aware conversation compaction with KG guards.
 * ## Does not do: trigger decisions or circuit-breaker state ownership.
 * ## Dependency direction: ai/compact -> shared(tokenBudget) + ai(costTracker).
 * ## Invariants: INV-3, INV-5, INV-6, INV-9, INV-10.
 */

import { randomUUID } from "node:crypto";

import { estimateTokens } from "@shared/tokenBudget";

import type { CostTracker } from "../costTracker";

export type CompactMessageRole = "system" | "user" | "assistant" | "tool";

export interface CompactMessage {
  id: string;
  role: CompactMessageRole;
  content: string;
  compactable?: boolean;
}

export interface NarrativeKnowledgeSnapshot {
  entities: string[];
  relations: string[];
  characterSettings: string[];
  unresolvedPlotPoints: string[];
}

export interface SkillSummaryInvocation {
  skillId: string;
  modelId: string;
  input: string;
  summaryMaxTokens: number;
  requestId: string;
}

export interface SkillSummaryResult {
  summary: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

export interface NarrativeCompactDeps {
  invokeSkillSummary: (
    request: SkillSummaryInvocation,
  ) => Promise<SkillSummaryResult>;
  costTracker?: Pick<CostTracker, "recordUsage">;
}

export interface NarrativeCompactRequest {
  messages: CompactMessage[];
  preserveRecentRounds: number;
  summaryMaxTokens: number;
  auxiliaryModel: string;
  kgSnapshot: NarrativeKnowledgeSnapshot;
  requestId?: string;
}

export interface NarrativeCompactResult {
  compactedMessages: CompactMessage[];
  summaryMessage: CompactMessage;
  preservedMessages: CompactMessage[];
}

const NARRATIVE_COMPACT_SKILL_ID = "builtin:summarize";
const NARRATIVE_COMPACT_SKILL_USAGE_ID = "builtin:narrative-compact";

function toMessageText(messages: readonly CompactMessage[]): string {
  return messages
    .map((message) => `[${message.role}] ${message.content}`)
    .join("\n");
}

function splitConversationByRecentRounds(
  messages: ReadonlyArray<CompactMessage>,
  keepRecentRounds: number,
): {
  historyMessages: CompactMessage[];
  recentMessages: CompactMessage[];
} {
  if (keepRecentRounds <= 0 || messages.length === 0) {
    return {
      historyMessages: [...messages],
      recentMessages: [],
    };
  }

  const rounds: CompactMessage[][] = [];
  for (const message of messages) {
    const lastRound = rounds.at(-1);
    if (message.role === "user" || lastRound === undefined) {
      rounds.push([message]);
      continue;
    }
    lastRound.push(message);
  }

  const recentRounds = rounds.slice(-keepRecentRounds);
  const historyRounds = rounds.slice(0, Math.max(0, rounds.length - keepRecentRounds));
  return {
    historyMessages: historyRounds.flat(),
    recentMessages: recentRounds.flat(),
  };
}

function buildNarrativeCompactPrompt(args: {
  historyMessages: ReadonlyArray<CompactMessage>;
  kgSnapshot: NarrativeKnowledgeSnapshot;
}): string {
  const historyText = toMessageText(args.historyMessages);

  return [
    "You are compressing fiction-writing conversation history.",
    "Return a compact narrative summary in Chinese.",
    "MUST preserve:",
    "1) All KG entities and relations by exact name.",
    "2) Character settings and world settings.",
    "3) Unresolved plot points and pending clues.",
    "Output format:",
    "## Narrative Summary",
    "- key events",
    "## KG Entities",
    "- exact names",
    "## KG Relations",
    "- exact relations",
    "## Character & World Settings",
    "- preserved settings",
    "## Unresolved Plot Points",
    "- unresolved points",
    "",
    `[KG_ENTITIES] ${args.kgSnapshot.entities.join(" | ")}`,
    `[KG_RELATIONS] ${args.kgSnapshot.relations.join(" | ")}`,
    `[CHARACTER_SETTINGS] ${args.kgSnapshot.characterSettings.join(" | ")}`,
    `[UNRESOLVED_PLOT_POINTS] ${args.kgSnapshot.unresolvedPlotPoints.join(" | ")}`,
    "",
    "[HISTORY]",
    historyText,
  ].join("\n");
}

function appendMissingNarrativeAnchors(args: {
  summary: string;
  kgSnapshot: NarrativeKnowledgeSnapshot;
}): string {
  const missingEntities = args.kgSnapshot.entities.filter(
    (entity) => !args.summary.includes(entity),
  );
  const missingRelations = args.kgSnapshot.relations.filter(
    (relation) => !args.summary.includes(relation),
  );
  const missingSettings = args.kgSnapshot.characterSettings.filter(
    (setting) => !args.summary.includes(setting),
  );
  const missingPlotPoints = args.kgSnapshot.unresolvedPlotPoints.filter(
    (plotPoint) => !args.summary.includes(plotPoint),
  );

  if (
    missingEntities.length === 0 &&
    missingRelations.length === 0 &&
    missingSettings.length === 0 &&
    missingPlotPoints.length === 0
  ) {
    return args.summary;
  }

  const suffixLines = [
    "",
    "## Preservation Addendum",
    missingEntities.length > 0
      ? `- KG entities: ${missingEntities.join("、")}`
      : undefined,
    missingRelations.length > 0
      ? `- KG relations: ${missingRelations.join("、")}`
      : undefined,
    missingSettings.length > 0
      ? `- Character/World settings: ${missingSettings.join("、")}`
      : undefined,
    missingPlotPoints.length > 0
      ? `- Unresolved plot points: ${missingPlotPoints.join("、")}`
      : undefined,
  ].filter((line): line is string => line !== undefined);

  return `${args.summary.trim()}\n${suffixLines.join("\n")}`.trim();
}

function dedupeById(messages: ReadonlyArray<CompactMessage>): CompactMessage[] {
  const seen = new Set<string>();
  const deduped: CompactMessage[] = [];
  for (const message of messages) {
    if (seen.has(message.id)) {
      continue;
    }
    seen.add(message.id);
    deduped.push(message);
  }
  return deduped;
}

export function createNarrativeCompact(deps: NarrativeCompactDeps): {
  compact: (request: NarrativeCompactRequest) => Promise<NarrativeCompactResult>;
} {
  async function compact(
    request: NarrativeCompactRequest,
  ): Promise<NarrativeCompactResult> {
    const requestId = request.requestId ?? randomUUID();
    const systemMessages = request.messages.filter(
      (message) => message.role === "system",
    );
    const nonSystemMessages = request.messages.filter(
      (message) => message.role !== "system",
    );

    const { historyMessages, recentMessages } = splitConversationByRecentRounds(
      nonSystemMessages,
      request.preserveRecentRounds,
    );

    const pinnedHistoryMessages = historyMessages.filter(
      (message) => message.compactable === false,
    );
    const compactableHistoryMessages = historyMessages.filter(
      (message) => message.compactable !== false,
    );

    if (compactableHistoryMessages.length === 0) {
      const fallbackSummary: CompactMessage = {
        id: `compact-summary-${requestId}`,
        role: "assistant",
        content: "无需压缩：历史中没有可压缩内容。",
        compactable: false,
      };
      const preservedMessages = dedupeById([
        ...pinnedHistoryMessages,
        ...recentMessages,
      ]);
      return {
        compactedMessages: [...systemMessages, fallbackSummary, ...preservedMessages],
        summaryMessage: fallbackSummary,
        preservedMessages,
      };
    }

    const prompt = buildNarrativeCompactPrompt({
      historyMessages: compactableHistoryMessages,
      kgSnapshot: request.kgSnapshot,
    });
    const skillResult = await deps.invokeSkillSummary({
      skillId: NARRATIVE_COMPACT_SKILL_ID,
      modelId: request.auxiliaryModel,
      input: prompt,
      summaryMaxTokens: request.summaryMaxTokens,
      requestId,
    });
    const completedSummary = appendMissingNarrativeAnchors({
      summary: skillResult.summary,
      kgSnapshot: request.kgSnapshot,
    });

    const summaryMessage: CompactMessage = {
      id: `compact-summary-${requestId}`,
      role: "assistant",
      compactable: false,
      content: completedSummary,
    };

    const preservedMessages = dedupeById([
      ...pinnedHistoryMessages,
      ...recentMessages,
    ]);

    const promptTokens =
      skillResult.usage?.promptTokens ?? estimateTokens(prompt);
    const completionTokens =
      skillResult.usage?.completionTokens ?? estimateTokens(completedSummary);

    deps.costTracker?.recordUsage(
      {
        promptTokens,
        completionTokens,
      },
      request.auxiliaryModel,
      requestId,
      NARRATIVE_COMPACT_SKILL_USAGE_ID,
    );

    return {
      compactedMessages: [...systemMessages, summaryMessage, ...preservedMessages],
      summaryMessage,
      preservedMessages,
    };
  }

  return { compact };
}
