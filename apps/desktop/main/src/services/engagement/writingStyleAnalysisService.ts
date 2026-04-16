/**
 * @module writingStyleAnalysisService
 * ## Responsibilities: Build a per-project writing style profile from SQLite/KG statistics.
 * ## Does not do: LLM generation, IPC registration, Memory write-back.
 * ## Dependency direction: DB layer only.
 * ## Invariants: INV-4 (structured retrieval first, no additional vector storage).
 */

import type { DbLike } from "./dbTypes";

export type AnalysisScope = "recent" | "full";

export interface NarrativePattern {
  readonly pattern: string;
  readonly frequency: number;
  readonly examples: string[];
}

export interface CharacterArchetype {
  readonly archetype: string;
  readonly characters: string[];
  readonly evidence: string;
}

export interface RhythmStats {
  readonly avgChapterLength: number;
  readonly dialogueRatio: number;
  readonly paceVariation: number;
}

export interface WritingSchedule {
  readonly peakHours: number[];
  /** Average session duration in minutes. */
  readonly avgSessionDuration: number;
  readonly streakDays: number;
}

export interface WritingStyleProfile {
  readonly narrativePatterns: NarrativePattern[];
  readonly characterArchetypes: CharacterArchetype[];
  readonly rhythmStats: RhythmStats;
  readonly writingSchedule: WritingSchedule;
}

export interface WritingStyleAnalysisService {
  analyze(args: { projectId: string; scope: AnalysisScope }): WritingStyleProfile;
}

type Row = Record<string, unknown>;

const RECENT_CHAPTER_LIMIT = 10;
const RECENT_TRACE_LIMIT = 500;
const DEFAULT_PATTERN_LIMIT = 5;
const PEAK_HOUR_LIMIT = 3;

const SQL_DOCS_FULL = `
  SELECT document_id, title, content_text, word_count, updated_at
  FROM documents
  WHERE project_id = ?
    AND type = 'chapter'
  ORDER BY updated_at DESC
`;

const SQL_DOCS_RECENT = `
  SELECT document_id, title, content_text, word_count, updated_at
  FROM documents
  WHERE project_id = ?
    AND type = 'chapter'
  ORDER BY updated_at DESC
  LIMIT ${RECENT_CHAPTER_LIMIT.toString()}
`;

const SQL_RELATION_PATTERN = `
  SELECT
    relation_type,
    COUNT(*) AS frequency,
    GROUP_CONCAT(source_entity_id || '→' || target_entity_id, '|') AS examples
  FROM kg_relations
  WHERE project_id = ?
  GROUP BY relation_type
  ORDER BY frequency DESC, relation_type ASC
  LIMIT ${DEFAULT_PATTERN_LIMIT.toString()}
`;

const SQL_CHARACTERS = `
  SELECT name, description, attributes_json
  FROM kg_entities
  WHERE project_id = ?
    AND type = 'character'
  ORDER BY created_at ASC
`;

const SQL_TRACES_FULL = `
  SELECT started_at, completed_at, created_at
  FROM generation_traces
  WHERE project_id = ?
  ORDER BY created_at DESC
`;

const SQL_TRACES_RECENT = `
  SELECT started_at, completed_at, created_at
  FROM generation_traces
  WHERE project_id = ?
  ORDER BY created_at DESC
  LIMIT ${RECENT_TRACE_LIMIT.toString()}
`;

const SQL_TABLE_EXISTS = `
  SELECT 1
  FROM sqlite_master
  WHERE type = 'table'
    AND name = ?
  LIMIT 1
`;

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function toTimestampMs(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, n) => acc + n, 0) / values.length;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function estimateDialogueChars(content: string): number {
  let total = 0;
  const patterns = [
    /“([^”]+)”/g,
    /"([^"]+)"/g,
    /「([^」]+)」/g,
    /『([^』]+)』/g,
  ] as const;
  for (const pattern of patterns) {
    let match = pattern.exec(content);
    while (match !== null) {
      total += match[1]?.length ?? 0;
      match = pattern.exec(content);
    }
  }
  return total;
}

function inferArchetype(row: Row): { archetype: string; evidence: string } {
  const description = String(row.description ?? "");

  let attrs: Record<string, unknown> = {};
  try {
    const raw = row.attributes_json;
    if (typeof raw === "string" && raw.trim().length > 0) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        attrs = parsed as Record<string, unknown>;
      }
    }
  } catch {
    // ignore malformed JSON
  }

  if (typeof attrs.archetype === "string" && attrs.archetype.trim().length > 0) {
    return { archetype: attrs.archetype.trim(), evidence: "attributes_json.archetype" };
  }

  const lowered = `${description} ${String(attrs.role ?? "")}`.toLowerCase();
  const map: Array<{ key: string; cues: string[] }> = [
    { key: "mentor", cues: ["导师", "mentor", "引导", "师父"] },
    { key: "rebel", cues: ["叛逆", "反叛", "rebel"] },
    { key: "strategist", cues: ["策略", "谋略", "tactic", "strategy"] },
    { key: "guardian", cues: ["守护", "保护", "guardian"] },
  ];
  for (const entry of map) {
    if (entry.cues.some((cue) => lowered.includes(cue.toLowerCase()))) {
      return {
        archetype: entry.key,
        evidence: `description/role keyword: ${entry.cues.find((cue) =>
          lowered.includes(cue.toLowerCase()),
        ) ?? entry.key}`,
      };
    }
  }
  return { archetype: "complex", evidence: "fallback" };
}

function computeStreakDays(timestamps: number[]): number {
  if (timestamps.length === 0) {
    return 0;
  }
  const daySet = new Set<string>();
  for (const ts of timestamps) {
    if (ts > 0) {
      daySet.add(new Date(ts).toISOString().slice(0, 10));
    }
  }
  if (daySet.size === 0) {
    return 0;
  }
  const sorted = [...daySet].sort().reverse();
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = Date.parse(`${sorted[i - 1]}T00:00:00Z`);
    const curr = Date.parse(`${sorted[i]}T00:00:00Z`);
    if ((prev - curr) / 86_400_000 === 1) {
      streak += 1;
      continue;
    }
    break;
  }
  return streak;
}

export interface WritingStyleAnalysisServiceDeps {
  db: DbLike;
}

export function createWritingStyleAnalysisService(
  deps: WritingStyleAnalysisServiceDeps,
): WritingStyleAnalysisService {
  const { db } = deps;

  const stmtTableExists = db.prepare(SQL_TABLE_EXISTS);
  const stmtDocsFull = db.prepare(SQL_DOCS_FULL);
  const stmtDocsRecent = db.prepare(SQL_DOCS_RECENT);
  const stmtRelationPattern = db.prepare(SQL_RELATION_PATTERN);
  const stmtCharacters = db.prepare(SQL_CHARACTERS);
  const stmtTracesFull = db.prepare(SQL_TRACES_FULL);
  const stmtTracesRecent = db.prepare(SQL_TRACES_RECENT);

  function tableExists(name: string): boolean {
    return Boolean(stmtTableExists.get(name));
  }

  function queryDocs(projectId: string, scope: AnalysisScope): Row[] {
    if (!tableExists("documents")) {
      return [];
    }
    return (scope === "recent"
      ? stmtDocsRecent.all(projectId)
      : stmtDocsFull.all(projectId)) as Row[];
  }

  function queryPatterns(projectId: string): NarrativePattern[] {
    if (!tableExists("kg_relations")) {
      return [];
    }
    const rows = stmtRelationPattern.all(projectId) as Row[];
    return rows.map((row) => ({
      pattern: String(row.relation_type ?? "unknown"),
      frequency: Math.max(0, Math.floor(toNumber(row.frequency))),
      examples: String(row.examples ?? "")
        .split("|")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, 3),
    }));
  }

  function queryArchetypes(projectId: string): CharacterArchetype[] {
    if (!tableExists("kg_entities")) {
      return [];
    }
    const rows = stmtCharacters.all(projectId) as Row[];
    const grouped = new Map<
      string,
      { names: string[]; evidence: Set<string> }
    >();

    for (const row of rows) {
      const name = String(row.name ?? "").trim();
      if (!name) {
        continue;
      }
      const inferred = inferArchetype(row);
      const bucket =
        grouped.get(inferred.archetype) ??
        (() => {
          const created = { names: [] as string[], evidence: new Set<string>() };
          grouped.set(inferred.archetype, created);
          return created;
        })();
      bucket.names.push(name);
      bucket.evidence.add(inferred.evidence);
    }

    return [...grouped.entries()].map(([archetype, value]) => ({
      archetype,
      characters: value.names,
      evidence: [...value.evidence].slice(0, 2).join("; "),
    }));
  }

  function querySchedule(projectId: string, scope: AnalysisScope): WritingSchedule {
    if (!tableExists("generation_traces")) {
      return {
        peakHours: [],
        avgSessionDuration: 0,
        streakDays: 0,
      };
    }

    const rows = (scope === "recent"
      ? stmtTracesRecent.all(projectId)
      : stmtTracesFull.all(projectId)) as Row[];

    const hourCount = new Map<number, number>();
    const durations: number[] = [];
    const tsForStreak: number[] = [];

    for (const row of rows) {
      const startedAt = toTimestampMs(row.started_at);
      const completedAt = toTimestampMs(row.completed_at);
      const createdAt = toTimestampMs(row.created_at);
      const anchorTs = createdAt || completedAt || startedAt;
      if (anchorTs > 0) {
        tsForStreak.push(anchorTs);
        const hour = new Date(anchorTs).getUTCHours();
        hourCount.set(hour, (hourCount.get(hour) ?? 0) + 1);
      }
      if (startedAt > 0 && completedAt >= startedAt) {
        durations.push((completedAt - startedAt) / 60_000);
      }
    }

    const peakHours = [...hourCount.entries()]
      .sort((a, b) => {
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }
        return a[0] - b[0];
      })
      .slice(0, PEAK_HOUR_LIMIT)
      .map(([hour]) => hour);

    return {
      peakHours,
      avgSessionDuration: round2(mean(durations)),
      streakDays: computeStreakDays(tsForStreak),
    };
  }

  const service: WritingStyleAnalysisService = {
    analyze(args): WritingStyleProfile {
      if (!args.projectId) {
        throw new Error("projectId is required");
      }

      const docs = queryDocs(args.projectId, args.scope);
      const chapterLengths: number[] = [];
      let dialogueChars = 0;
      let allChars = 0;

      for (const row of docs) {
        const content = String(row.content_text ?? "");
        const textLength = content.replace(/\s+/g, "").length;
        const wordCount = Math.max(0, Math.floor(toNumber(row.word_count)));
        const chapterLength = wordCount > 0 ? wordCount : textLength;
        chapterLengths.push(chapterLength);
        allChars += textLength;
        dialogueChars += estimateDialogueChars(content);
      }

      const avgLength = mean(chapterLengths);
      const variance =
        chapterLengths.length > 0
          ? mean(chapterLengths.map((n) => (n - avgLength) ** 2))
          : 0;
      const std = Math.sqrt(variance);
      const paceVariation = avgLength > 0 ? std / avgLength : 0;

      return {
        narrativePatterns: queryPatterns(args.projectId),
        characterArchetypes: queryArchetypes(args.projectId),
        rhythmStats: {
          avgChapterLength: Math.max(0, Math.round(avgLength)),
          dialogueRatio:
            allChars > 0 ? round2(Math.min(1, Math.max(0, dialogueChars / allChars))) : 0,
          paceVariation: round2(Math.max(0, paceVariation)),
        },
        writingSchedule: querySchedule(args.projectId, args.scope),
      };
    },
  };

  return service;
}
