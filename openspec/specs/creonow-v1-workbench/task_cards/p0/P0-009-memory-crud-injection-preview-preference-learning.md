# P0-009: Memory（CRUD + settings + injection preview + preference learning）

Status: done

## Goal

交付可控、可学习、可降级的记忆系统：memory CRUD、settings、注入预览、偏好学习闭环（来自 `ai:skill:feedback`）；并确保 embedding/vector 不可用时不阻断技能运行。

## Dependencies

- Spec: `../spec.md#cnwb-req-070`
- Design: `../design/05-memory-system.md`
- Design: `../design/03-ipc-contract-and-errors.md`
- P0-004: `./P0-004-sqlite-bootstrap-migrations-logs.md`
- P0-006: `./P0-006-ai-runtime-fake-provider-stream-cancel-timeout.md`（feedback 通道）

## Expected File Changes

| 操作   | 文件路径                                                                                                  |
| ------ | --------------------------------------------------------------------------------------------------------- |
| Add    | `apps/desktop/main/src/ipc/memory.ts`                                                                     |
| Add    | `apps/desktop/main/src/services/memory/memoryService.ts`（CRUD + injection preview + deterministic sort） |
| Add    | `apps/desktop/main/src/services/memory/preferenceLearning.ts`（噪声过滤 + 阈值触发）                      |
| Update | `apps/desktop/main/src/db/migrations/0001_init.sql`（user_memory + settings + feedback 表）               |
| Update | `apps/desktop/main/src/ipc/ai.ts`（实现 `ai:skill:feedback` 写入与触发学习）                              |
| Add    | `apps/desktop/renderer/src/features/memory/MemoryPanel.tsx`（可先最小列表/开关）                          |
| Add    | `apps/desktop/renderer/src/stores/memoryStore.ts`                                                         |
| Add    | `apps/desktop/tests/e2e/memory-preference-learning.spec.ts`                                               |
| Add    | `apps/desktop/tests/unit/preferenceLearning.test.ts`                                                      |

## Acceptance Criteria

- [x] CRUD：
  - [x] `memory:create/list/update/delete` 可用，错误码语义稳定
  - [x] 删除为软删除（tombstone）
- [x] settings：
  - [x] `injectionEnabled/preferenceLearningEnabled/privacyModeEnabled/preferenceLearningThreshold` 可读写
  - [x] 关闭 injection 后：注入为空且 prompt 模板保持稳定空占位
- [x] injection preview：
  - [x] `memory:injection:preview` 返回按最终注入顺序排列的 items
  - [x] deterministic 排序完全确定（tie-break 写死）
- [x] preference learning：
  - [x] `ai:skill:feedback(accept/reject)` 入库
  - [x] 达阈值后生成 learned preference（并可在 list/preview 中出现）
  - [x] 噪声信号被忽略（ignored 计数可观测）
- [x] 降级：
  - [x] embedding/vector 不可用时：preview 仍可运行（mode=deterministic），不得阻断 skill

## Tests

- [x] Unit：`preferenceLearning.test.ts`
  - [x] 空/过短 evidenceRef → ignored
  - [x] 达阈值 → learned memory 생성
- [x] E2E（Windows）`memory-preference-learning.spec.ts`
  - [x] 开启 injection + learning（threshold=1）
  - [x] 创建一条手动 preference
  - [x] `memory:injection:preview(queryText)` 断言包含该 preference
  - [x] `ai:skill:run`（fake AI）可运行（不回归）
  - [x] `ai:skill:feedback accept`（带 evidenceRef）
  - [x] `memory:injection:preview` 断言 learned preference 出现
  - [x] 关闭 injection → preview items 为空（但模板结构稳定）

## Edge cases & Failure modes

- `runId` 不存在 → `NOT_FOUND`
- `evidenceRef` 过大/包含敏感信息 → privacy mode 下必须剔除或抽象化
- DB 错误 → `DB_ERROR`，不得 silent failure

## Observability

- `main.log` 必须记录：
  - `memory_create/update/delete`
  - `memory_injection_preview`（mode + count）
  - `preference_signal_ingested`（action + ignored/learned）

## Completion

- Issue: #41
- PR: #45
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-41.md`
