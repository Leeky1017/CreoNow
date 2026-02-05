# P1-001: AI History（移除 MOCK_HISTORY，实现真实历史切换）

Status: todo

## Goal

把 AI Panel 的 History 从占位 UI（`MOCK_HISTORY` + onSelect 仅关闭下拉）升级为真实可用：

- 自动记录每次 AI run 的（request + output + metadata）
- History 下拉展示真实历史列表（按 Today/Yesterday/Earlier 分组）
- 点击某条历史可切换到该 run（在 AiPanel 展示对应 request/output）
- 允许 rename/delete（当前 UI 已有 disabled 按钮）

> 审评报告定位：
>
> - `apps/desktop/renderer/src/features/ai/ChatHistory.tsx` 使用 `MOCK_HISTORY`
> - `apps/desktop/renderer/src/features/ai/AiPanel.tsx:474` onSelectChat 仅关闭下拉

## Non-goals（避免范围爆炸）

- 不做“多轮上下文对话”与 prompt 拼接重构（本卡只记录单轮 run 的 request/output）
- 不把 AI History 接入 Memory/KnowledgeGraph（后续卡再做）

## Dependencies

- Spec: `../spec.md#cnmvp-req-011`（占位交互必须接电）
- Design reference: `../design/01-delta-map.md`（映射）

## Expected File Changes

| 操作       | 文件路径                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Add        | `apps/desktop/main/src/db/migrations/0011_ai_history.sql`（新增 ai_history 表）                 |
| Update     | `apps/desktop/main/src/ipc/contract/ipc-contract.ts`（新增 `ai:history:*` 通道）                |
| Update     | `packages/shared/types/ipc-generated.ts`（codegen）                                             |
| Add        | `apps/desktop/main/src/services/ai/aiHistoryService.ts`（CRUD）                                 |
| Add/Update | `apps/desktop/main/src/ipc/aiHistory.ts`（或合并进 `ipc/ai.ts`）                                |
| Update     | `apps/desktop/renderer/src/stores/aiStore.ts`（run 完成后写入历史；选中历史时加载）             |
| Update     | `apps/desktop/renderer/src/features/ai/ChatHistory.tsx`（移除 MOCK_HISTORY；接入 store/IPC）    |
| Update     | `apps/desktop/renderer/src/features/ai/AiPanel.tsx`（onSelectChat 真切换）                      |
| Add        | `apps/desktop/tests/unit/aiHistoryService.test.ts`（main：SQLite roundtrip）                    |
| Add        | `apps/desktop/renderer/src/features/ai/ChatHistory.test.tsx`（Vitest：列表/选择/rename/delete） |

## Detailed Breakdown（建议拆分 PR）

1. PR-A（DB + IPC + main service）
   - 1.1 新增 migration `0011_ai_history.sql`
     - 表建议（写死字段）：
       - `run_id TEXT PRIMARY KEY`
       - `project_id TEXT NOT NULL`
       - `document_id TEXT`
       - `skill_id TEXT NOT NULL`
       - `title TEXT NOT NULL`
       - `request_text TEXT NOT NULL`
       - `output_text TEXT NOT NULL`
       - `created_at INTEGER NOT NULL`
       - `updated_at INTEGER NOT NULL`
       - `deleted_at INTEGER`
   - 1.2 新增 IPC 通道（写死最小集合）：
     - `ai:history:list` `{ projectId, limit? } -> { items: [{ runId, title, createdAt }] }`
     - `ai:history:read` `{ runId } -> { runId, projectId, documentId?, skillId, title, requestText, outputText, createdAt }`
     - `ai:history:write` `{ runId, projectId, documentId?, skillId, title, requestText, outputText, ts } -> { written: true }`
     - `ai:history:rename` `{ runId, title, ts } -> { updated: true }`
     - `ai:history:delete` `{ runId, ts } -> { deleted: true }`
   - 1.3 main `aiHistoryService`：
     - deterministic error codes（INVALID_ARGUMENT/NOT_FOUND/DB_ERROR）
     - list 默认按 `created_at DESC`
   - 1.4 单测：SQLite in-memory roundtrip 覆盖 write/list/read/rename/delete

2. PR-B（renderer 接入）
   - 2.1 `aiStore.run` 完成后调用 `ai:history:write`
     - title 生成规则写死：取 request 第一行，截断到 60 chars（fallback `Untitled`）
   - 2.2 `ChatHistory`：
     - 移除 `MOCK_HISTORY`
     - open 时加载 list（或由 store 提前 cache）
     - onSelectChat：调用 `ai:history:read` 并把 request/output 填入 AiPanel 展示态
     - rename/delete 按钮启用（使用 SystemDialog confirm for delete，或最小 confirm）
   - 2.3 Vitest：覆盖 list 渲染、选择切换、rename/delete 的 disabled→enabled 变化

## Conflict Notes

- 该任务会触碰 `ipc-contract.ts` + codegen：必须与其他 contract 变更串行排队（见 Design 09）。

## Acceptance Criteria

- [ ] `MOCK_HISTORY` 被完全移除
- [ ] AI 每次 run 完成后在 DB 中产生一条历史记录（同 runId 幂等）
- [ ] History 下拉展示真实历史列表并可选择切换
- [ ] rename/delete 可用且可持久化（重启仍在）
- [ ] 至少有 unit + component tests 门禁覆盖

## Tests

- [ ] `pnpm test:unit`（包含 aiHistoryService roundtrip）
- [ ] `pnpm -C apps/desktop test:run`（ChatHistory 组件测试）

## Edge cases

- outputText 很长：DB 写入不应阻塞 UI（必要时异步/批量，但必须可观测）
- 列表为空：UI 必须展示 EmptyState（不得白屏）
- 删除当前选中历史：AiPanel 退回到当前 run 或清空（写死行为）

## Observability

- main.log：
  - `ai_history_written` / `ai_history_renamed` / `ai_history_deleted`

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`
