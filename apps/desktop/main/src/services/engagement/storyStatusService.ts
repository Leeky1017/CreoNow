/**
 * @module storyStatusService
 * ## 职责：故事状态摘要服务 — 当项目打开时聚合写作进度快照
 * ## 不做什么：不调用 LLM，不写入任何数据，不做推断以外的副作用
 * ## 依赖方向：Service Layer → DB Layer + Shared；禁止 Renderer 直调
 * ## 关键不变量：INV-4（Memory-First，纯 SQL + KG，无 LLM）、INV-9（无 AI 成本）
 * ## 性能约束：getStoryStatus ≤ 200ms（AGENTS.md §P-E；engagement-engine.md §三.机制1）
 *
 * 实现策略：
 *   1. documents 表：章节列表 + 最近编辑文档 (interrupt point)
 *   2. kg_entities 表：伏笔实体（attributes_json.isForeshadowing=true, status≠resolved）
 *   3. user_memory 表 (L0)：用户偏好 (scope='project')
 *   4. suggestedAction：从中断点 + 未解伏笔数量推断（无 LLM）
 *
 * 缓存策略：每个 projectId 缓存 30s，文档变更（updatedAt）触发失效。
 * 选 30s 而非更短：打开项目后用户通常在 30s 内完成阅读摘要，避免重复查询。
 */

import type Database from "better-sqlite3";

import type { Logger } from "../../logging/logger";
import { ipcError, ipcOk, type ServiceResult } from "../shared/ipcResult";

// ─── 公共类型 ──────────────────────────────────────────────────────────────

export type ChapterProgress = {
  /** 最近编辑章节序号（1-based，按 sort_order 排） */
  currentChapterNumber: number;
  /** 项目下 type='chapter' 的文档总数 */
  totalChapters: number;
  /** 最近编辑章节标题 */
  currentChapterTitle: string;
};

export type InterruptedTask = {
  /** 最近编辑章节标题 */
  chapterTitle: string;
  /** 最近编辑章节 documentId */
  documentId: string;
  /** 最近编辑时间戳（ms） */
  lastEditedAt: number;
};

export type ForeshadowingThread = {
  /** KG 实体 id */
  id: string;
  /** 伏笔实体名称 */
  name: string;
  /** 从 KG attributes_json 读取的伏笔描述 */
  description: string;
};

export type StoryStatusSummary = {
  /** 章节进度 */
  chapterProgress: ChapterProgress;
  /** 中断点（用户上次写到哪）；若无章节则为 null */
  interruptedTask: InterruptedTask | null;
  /** 未解伏笔列表（从 KG 查询） */
  activeForeshadowing: ForeshadowingThread[];
  /** 推断的下一步动作（纯规则推断，无 LLM） */
  suggestedAction: string;
  /** 摘要生成耗时（ms），用于性能监控 */
  queryCostMs: number;
};

// ─── 服务接口 ──────────────────────────────────────────────────────────────

export type StoryStatusService = {
  /**
   * 获取故事状态摘要。
   *
   * @why 这是成瘾引擎的启动按钮（engagement-engine.md §三.机制1），每次用户打开
   *   项目时调用，用于「零摩擦恢复写作状态」。严禁 LLM 调用（INV-4/INV-9）。
   * @risk 若 projectId 不存在于 projects 表，返回空结果而非错误，避免 onboarding 失败。
   */
  getStoryStatus: (args: {
    projectId: string;
  }) => ServiceResult<StoryStatusSummary>;

  /**
   * 显式失效指定 projectId 的缓存。
   * 应在 documents 表更新后调用（IPC handler 负责触发）。
   */
  invalidateCache: (projectId: string) => void;
};

// ─── 缓存结构 ──────────────────────────────────────────────────────────────

// 30s TTL — engagement-engine.md §三.机制1 明确约束 ≤200ms；30s 足够覆盖用户阅读
// 摘要窗口，同时避免数据陈旧。
const CACHE_TTL_MS = 30_000;

type CacheEntry = {
  summary: StoryStatusSummary;
  cachedAt: number;
  /** documents 表最近 updatedAt，用于失效检测 */
  documentsStamp: number;
};

// ─── DB 行类型 ─────────────────────────────────────────────────────────────

type ChapterRow = {
  documentId: string;
  title: string;
  sortOrder: number;
  updatedAt: number;
};

type KgEntityRow = {
  id: string;
  name: string;
  description: string;
  attributesJson: string;
};

// ─── 推断 suggestedAction（无 LLM）──────────────────────────────────────────

/**
 * 基于中断点和未解伏笔数量推断下一步。
 *
 * @why 纯规则推断保证 ≤200ms SLO（无 LLM 调用），覆盖最高频的 3 种场景。
 * 规则优先级：有未解伏笔 > 章节未完成 > 继续写作。
 */
function inferSuggestedAction(args: {
  hasInterruptedTask: boolean;
  activeForeshadowingCount: number;
  currentChapterNumber: number;
  totalChapters: number;
}): string {
  const { hasInterruptedTask, activeForeshadowingCount, currentChapterNumber, totalChapters } = args;

  // 有未解伏笔且超过 3 个 → 优先提示回收
  if (activeForeshadowingCount >= 3) {
    return `回收伏笔（${activeForeshadowingCount} 条待解）`;
  }

  // 有中断点 → 继续上次写作
  if (hasInterruptedTask) {
    return "继续写作";
  }

  // 章节进度未完 → 开始新章节
  if (totalChapters > 0 && currentChapterNumber < totalChapters) {
    return `开始第 ${currentChapterNumber + 1} 章`;
  }

  // 有任意伏笔 → 提示回收
  if (activeForeshadowingCount > 0) {
    return `回收伏笔（${activeForeshadowingCount} 条待解）`;
  }

  // 默认
  return "继续写作";
}

// ─── 工厂函数 ──────────────────────────────────────────────────────────────

/**
 * 创建 StoryStatusService 实例。
 *
 * @why 使用工厂模式与现有 Service 层（statsService/memoryService）保持一致，
 *   便于注入 db + logger 依赖（INV-4）。
 */
export function createStoryStatusService(deps: {
  db: Database.Database;
  logger: Logger;
}): StoryStatusService {
  const { db, logger } = deps;

  // 每个 projectId 一条缓存，Map 容量无上限（实际项目数量 <100）
  const cache = new Map<string, CacheEntry>();

  function getDocumentsStamp(projectId: string): number {
    try {
      const row = db
        .prepare<[string], { maxUpdatedAt: number }>(
          "SELECT COALESCE(MAX(updated_at), 0) AS maxUpdatedAt FROM documents WHERE project_id = ? AND type = 'chapter'",
        )
        .get(projectId);
      return row?.maxUpdatedAt ?? 0;
    } catch (error) {
      logger.error("story_status_stamp_query_failed", {
        projectId,
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  function isCacheValid(entry: CacheEntry, projectId: string, now: number): boolean {
    if (now - entry.cachedAt > CACHE_TTL_MS) {
      return false;
    }
    // 文档变更失效检测：取当前 stamp 与缓存 stamp 对比
    const currentStamp = getDocumentsStamp(projectId);
    return currentStamp === entry.documentsStamp;
  }

  return {
    getStoryStatus: ({ projectId }) => {
      const startedAt = Date.now();

      if (!projectId || projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }

      const normalizedId = projectId.trim();
      const now = Date.now();

      // ── 缓存命中 ──────────────────────────────────────────────
      const cached = cache.get(normalizedId);
      if (cached && isCacheValid(cached, normalizedId, now)) {
        logger.info("story_status_cache_hit", { projectId: normalizedId });
        return ipcOk(cached.summary);
      }

      try {
        // ── 1. 章节列表（documents 表） ────────────────────────
        // 仅 type='chapter' 的文档；documents 表无软删除字段，按 sort_order 排序
        const chapterRows = db
          .prepare<[string], ChapterRow>(
            `SELECT document_id AS documentId, title, sort_order AS sortOrder, updated_at AS updatedAt
             FROM documents
             WHERE project_id = ? AND type = 'chapter'
             ORDER BY sort_order ASC, updated_at DESC, document_id ASC`,
          )
          .all(normalizedId);

        const totalChapters = chapterRows.length;

        // 最近编辑章节 — 按 updatedAt 最大值取
        let latestChapter: ChapterRow | null = null;
        let latestUpdatedAt = 0;
        for (const row of chapterRows) {
          if (row.updatedAt > latestUpdatedAt) {
            latestUpdatedAt = row.updatedAt;
            latestChapter = row;
          }
        }

        // 当前章节序号（1-based，在 sort_order 排序后的位置）
        let currentChapterNumber = 0;
        if (latestChapter) {
          const idx = chapterRows.findIndex((r) => r.documentId === latestChapter!.documentId);
          currentChapterNumber = idx >= 0 ? idx + 1 : 1;
        }

        const chapterProgress: ChapterProgress = {
          currentChapterNumber,
          totalChapters,
          currentChapterTitle: latestChapter?.title ?? "",
        };

        const interruptedTask: InterruptedTask | null = latestChapter
          ? {
              chapterTitle: latestChapter.title,
              documentId: latestChapter.documentId,
              lastEditedAt: latestChapter.updatedAt,
            }
          : null;

        // ── 2. 未解伏笔（kg_entities 表） ─────────────────────
        // 伏笔识别策略：attributes_json 中含 "isForeshadowing": true 且
        //   status 非 "resolved" 的实体。
        // 为什么不用 type='foreshadowing'：当前 KG schema CHECK 约束不含该类型
        //   (migration 0013)；用 attributes_json 字段是不破坏 KG 类型系统的
        //   向前兼容方案（engagement-engine.md §三.机制1 约定）。
        const kgRows = db
          .prepare<[string], KgEntityRow>(
            `SELECT id, name, description,
                    attributes_json AS attributesJson
             FROM kg_entities
             WHERE project_id = ?
               AND JSON_EXTRACT(attributes_json, '$.isForeshadowing') = true
               AND (JSON_EXTRACT(attributes_json, '$.status') IS NULL
                    OR JSON_EXTRACT(attributes_json, '$.status') != 'resolved')
             ORDER BY updated_at DESC
             LIMIT 50`,
          )
          .all(normalizedId);

        const activeForeshadowing: ForeshadowingThread[] = kgRows.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
        }));

        // ── 3. 用户记忆 L0（user_memory 表）─────────────────
        // 当前版本暂不读取 user_memory，预留给未来 L0 集成路径。
        // INV-4 Memory-First 规范要求显式标记此扩展点，而非静默跳过。
        // TODO(L0-integration): 读取 scope='project' 偏好，注入 suggestedAction 推断

        // ── 4. 推断 suggestedAction ───────────────────────────
        const suggestedAction = inferSuggestedAction({
          hasInterruptedTask: interruptedTask !== null,
          activeForeshadowingCount: activeForeshadowing.length,
          currentChapterNumber,
          totalChapters,
        });

        const queryCostMs = Date.now() - startedAt;

        const summary: StoryStatusSummary = {
          chapterProgress,
          interruptedTask,
          activeForeshadowing,
          suggestedAction,
          queryCostMs,
        };

        // ── 写入缓存 ──────────────────────────────────────────
        const stamp = getDocumentsStamp(normalizedId);
        cache.set(normalizedId, { summary, cachedAt: now, documentsStamp: stamp });

        logger.info("story_status_computed", {
          projectId: normalizedId,
          totalChapters,
          activeForeshadowing: activeForeshadowing.length,
          queryCostMs,
        });

        return ipcOk(summary);
      } catch (error) {
        logger.error("story_status_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to compute story status");
      }
    },

    invalidateCache: (projectId: string) => {
      cache.delete(projectId.trim());
      logger.info("story_status_cache_invalidated", { projectId });
    },
  };
}
