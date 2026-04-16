/**
 * @module completionEstimatorService
 * ## Responsibilities: Estimate project completion words/date from chapter progress + recent writing velocity.
 * ## Does not do: LLM calls, IPC registration, UI rendering.
 * ## Dependency direction: DB layer only.
 * ## Invariants: INV-4 (structured retrieval path, no extra vector storage).
 */

import type { DbLike } from "./dbTypes";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface CompletionEstimate {
  readonly currentWordCount: number;
  readonly estimatedTotalWords: number;
  readonly estimatedCompletionDate: string | null;
  readonly confidenceLevel: ConfidenceLevel;
  readonly dailyAverage: number;
}

export interface CompletionEstimatorService {
  estimate(projectId: string): CompletionEstimate;
}

const SQL_TABLE_EXISTS = `
  SELECT 1
  FROM sqlite_master
  WHERE type = 'table'
    AND name = ?
  LIMIT 1
`;

const SQL_CURRENT_WORDS = `
  SELECT COALESCE(SUM(word_count), 0) AS total_words
  FROM documents
  WHERE project_id = ?
    AND type = 'chapter'
`;

const SQL_CHAPTER_COUNTS_WITH_STATUS = `
  SELECT
    COUNT(*) AS total_chapters,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_chapters,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN word_count END), 0) AS completed_words,
    COALESCE(AVG(CASE WHEN status = 'completed' THEN word_count END), 0) AS avg_completed_words
  FROM documents
  WHERE project_id = ?
    AND type = 'chapter'
`;

const SQL_CHAPTER_COUNTS_NO_STATUS = `
  SELECT
    COUNT(*) AS total_chapters,
    COUNT(CASE WHEN word_count > 0 THEN 1 END) AS completed_chapters,
    COALESCE(SUM(CASE WHEN word_count > 0 THEN word_count END), 0) AS completed_words,
    COALESCE(AVG(CASE WHEN word_count > 0 THEN word_count END), 0) AS avg_completed_words
  FROM documents
  WHERE project_id = ?
    AND type = 'chapter'
`;

const SQL_VERSION_DAILY_WORDS_30D = `
  WITH version_series AS (
    SELECT
      document_id,
      created_at,
      word_count,
      LAG(word_count, 1, 0) OVER (
        PARTITION BY document_id
        ORDER BY created_at ASC, version_id ASC
      ) AS prev_word_count
    FROM document_versions
    WHERE project_id = ?
      AND created_at <= ?
  ),
  daily_delta AS (
    SELECT
      date(created_at / 1000, 'unixepoch') AS day_key,
      SUM(
        CASE
          WHEN word_count > prev_word_count THEN word_count - prev_word_count
          ELSE 0
        END
      ) AS words_written
    FROM version_series
    WHERE created_at >= ?
    GROUP BY day_key
  )
  SELECT words_written
  FROM daily_delta
  WHERE words_written > 0
`;

const THIRTY_DAYS = 30;
const DAY_MS = 86_400_000;

function toCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.floor(n);
}

function toFloat(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return n;
}

function confidenceBySamples(sampleDays: number): ConfidenceLevel {
  if (sampleDays >= 21) {
    return "high";
  }
  if (sampleDays >= 7) {
    return "medium";
  }
  return "low";
}

export interface CompletionEstimatorServiceDeps {
  db: DbLike;
  nowMs?: () => number;
}

export function createCompletionEstimatorService(
  deps: CompletionEstimatorServiceDeps,
): CompletionEstimatorService {
  const { db } = deps;
  const nowMs = deps.nowMs ?? Date.now;

  const stmtTableExists = db.prepare(SQL_TABLE_EXISTS);
  const stmtCurrentWords = db.prepare(SQL_CURRENT_WORDS);
  const stmtChapterNoStatus = db.prepare(SQL_CHAPTER_COUNTS_NO_STATUS);
  const stmtVersionDailyWords = db.prepare(SQL_VERSION_DAILY_WORDS_30D);
  let stmtChapterWithStatus:
    | ReturnType<DbLike["prepare"]>
    | null = null;

  function tableExists(name: string): boolean {
    return Boolean(stmtTableExists.get(name));
  }

  function hasDocumentStatusColumn(): boolean {
    const rows = db.prepare("PRAGMA table_info(documents)").all() as Array<
      Record<string, unknown>
    >;
    return rows.some((row) => String(row.name ?? "") === "status");
  }

  function hasDocumentVersionWordCountColumn(): boolean {
    if (!tableExists("document_versions")) {
      return false;
    }
    const rows = db.prepare("PRAGMA table_info(document_versions)").all() as Array<
      Record<string, unknown>
    >;
    return rows.some((row) => String(row.name ?? "") === "word_count");
  }

  const service: CompletionEstimatorService = {
    estimate(projectId: string): CompletionEstimate {
      if (!projectId) {
        throw new Error("projectId is required");
      }
      if (!tableExists("documents")) {
        return {
          currentWordCount: 0,
          estimatedTotalWords: 0,
          estimatedCompletionDate: null,
          confidenceLevel: "low",
          dailyAverage: 0,
        };
      }

      const currentWordsRow = (stmtCurrentWords.get(projectId) ?? {}) as Record<
        string,
        unknown
      >;
      const currentWordCount = toCount(currentWordsRow.total_words);

      const chapterRow = (hasDocumentStatusColumn()
        ? (stmtChapterWithStatus ??= db.prepare(SQL_CHAPTER_COUNTS_WITH_STATUS)).get(
            projectId,
          )
        : stmtChapterNoStatus.get(projectId)) as Record<string, unknown> | undefined;

      const totalChapters = toCount(chapterRow?.total_chapters);
      const completedChapters = Math.min(
        totalChapters,
        toCount(chapterRow?.completed_chapters),
      );
      const completedWordCount = toCount(chapterRow?.completed_words);
      const avgCompletedWords = toFloat(chapterRow?.avg_completed_words);
      const remainingChapters = Math.max(0, totalChapters - completedChapters);

      const now = nowMs();
      const fromTs = now - (THIRTY_DAYS - 1) * DAY_MS;

      let dailyAverage = 0;
      let sampleDays = 0;
      if (hasDocumentVersionWordCountColumn()) {
        const rows = stmtVersionDailyWords.all(
          projectId,
          now,
          fromTs,
        ) as Array<Record<string, unknown>>;
        const values = rows.map((row) => toCount(row.words_written)).filter((v) => v > 0);
        sampleDays = values.length;
        if (values.length > 0) {
          const totalWordsWritten = values.reduce((sum, v) => sum + v, 0);
          dailyAverage = totalWordsWritten / THIRTY_DAYS;
        }
      }

      const fallbackAvgWords = avgCompletedWords > 0 ? avgCompletedWords : 1500;
      const estimatedFromOutline = Math.round(
        completedWordCount + remainingChapters * fallbackAvgWords,
      );
      const estimatedTotalWords = Math.max(currentWordCount, estimatedFromOutline);
      const remainingWords = Math.max(0, estimatedTotalWords - currentWordCount);

      let estimatedCompletionDate: string | null = null;
      if (remainingWords > 0 && dailyAverage > 0) {
        const days = remainingWords / dailyAverage;
        estimatedCompletionDate = new Date(now + days * DAY_MS).toISOString();
      }

      return {
        currentWordCount,
        estimatedTotalWords,
        estimatedCompletionDate,
        confidenceLevel: confidenceBySamples(sampleDays),
        dailyAverage: Math.round(dailyAverage),
      };
    },
  };

  return service;
}
