# Engagement Specification

## Purpose

定义故事参与度（Engagement）域对外能力，当前聚焦「故事状态摘要服务（Story Status Summary）」：为渲染进程提供可恢复创作上下文，不调用 LLM，仅依赖 SQLite 与 KG 结构化查询。

### Scope

| Layer | Path |
| --- | --- |
| IPC | `apps/desktop/main/src/ipc/engagement.ts` |
| Service | `apps/desktop/main/src/services/engagement/storyStatusService.ts` |
| Shared Contract | `packages/shared/types/ipc/engagement.ts` |

## Requirements

### Requirement: `engagement:storystatus:get` request-response contract

系统**必须**提供 `engagement:storystatus:get` IPC 通道，模式为 request-response。

- Request:
  - `projectId: string`（必填，非空）
- Success Response:
  - `chapterProgress: { currentChapterNumber: number; totalChapters: number; currentChapterTitle: string }`
  - `interruptedTask: { chapterTitle: string; documentId: string; lastEditedAt: number } | null`
  - `activeForeshadowing: Array<{ id: string; name: string; description: string }>`
  - `suggestedAction: string`
  - `queryCostMs: number`
- Error Response:
  - `INVALID_ARGUMENT`（参数不合法）
  - `DB_ERROR`（数据库未就绪或查询失败）
  - `FORBIDDEN`（project binding 校验失败）

#### Scenario: valid request returns summary

- **假设** 调用方传入合法 `projectId`
- **当** 主进程处理 `engagement:storystatus:get`
- **则** 返回 `{ ok: true, data: StoryStatusSummary }`
- **并且** `activeForeshadowing` 仅由 `attributes_json.isForeshadowing=true` 且 `status!=resolved` 判定

---

### Requirement: cache behavior contract

`StoryStatusService` 缓存**必须**满足以下约束：

1. TTL 固定 30 秒（`CACHE_TTL_MS = 30_000`）。
2. 命中缓存前必须执行双 stamp 校验（documents + kg_entities）：
   - 任一来源最新 `updated_at` 变化即视为缓存失效。
3. stamp 校验失败或 TTL 过期后，必须重算摘要并覆盖缓存。

#### Scenario: stamp changed invalidates cache immediately

- **假设** 未超过 30 秒 TTL
- **当** documents 或 kg_entities 的最新 `updated_at` 发生变化
- **则** 本次请求不得复用旧缓存，必须重算并返回新摘要

---

### Requirement: performance SLO

故事状态摘要组装（`engagement:storystatus:get`）在常规数据规模下 **p95 必须 ≤ 200ms**（纯 SQLite/KG 查询路径，禁止 LLM 参与）。

#### Scenario: summary query cost stays within budget

- **假设** 项目在常规章节与 KG 实体规模内
- **当** 调用 `engagement:storystatus:get`
- **则** `queryCostMs` 应稳定在 200ms 预算内

## Invariants

- **INV-4** Memory-First：保持 KG+FTS5 主路径，不引入 LLM 检索依赖。
- **INV-7** 统一入口（当前阶段注记）：IPC handler 仅做参数校验与服务转发。
- **INV-9** 成本可追踪：本能力无 LLM 调用，不产生 AI token 成本记录。
