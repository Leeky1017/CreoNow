/**
 * @module engagement
 * ## 职责：成瘾引擎服务层入口 — 聚合写作进度快照，驱动「零摩擦恢复写作状态」
 * ## 不做什么：不调用 LLM，不写入任何数据，不做业务推断以外的副作用
 * ## 依赖方向：Service Layer → DB Layer + Shared；禁止 Renderer 直调
 * ## 关键不变量：INV-4（Memory-First，纯 SQL + KG，无 LLM）、INV-9（无 AI 成本）
 * ## 性能约束：getStoryStatus ≤ 200ms（engagement-engine.md §三.机制1）
 */

export {
  createStoryStatusService,
  type StoryStatusService,
  type StoryStatusSummary,
  type ChapterProgress,
  type InterruptedTask,
  type ForeshadowingThread,
} from "./storyStatusService";
