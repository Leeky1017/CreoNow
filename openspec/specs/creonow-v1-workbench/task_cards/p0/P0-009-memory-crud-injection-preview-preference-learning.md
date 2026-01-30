# P0-009: Memory（CRUD + settings + injection preview + preference learning）

Status: pending

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

- [ ] CRUD：
  - [ ] `memory:create/list/update/delete` 可用，错误码语义稳定
  - [ ] 删除建议为软删除（若做硬删除必须在任务内写死原因与未来迁移策略）
- [ ] settings：
  - [ ] `injectionEnabled/preferenceLearningEnabled/privacyModeEnabled/preferenceLearningThreshold` 可读写
  - [ ] 关闭 injection 后：注入为空且 prompt 模板保持稳定空占位
- [ ] injection preview：
  - [ ] `memory:injection:preview` 返回按最终注入顺序排列的 items
  - [ ] deterministic 排序完全确定（tie-break 写死）
- [ ] preference learning：
  - [ ] `ai:skill:feedback(accept/reject)` 入库
  - [ ] 达阈值后生成 learned preference（并可在 list/preview 中出现）
  - [ ] 噪声信号被忽略（ignored 计数可观测）
- [ ] 降级：
  - [ ] embedding/vector 不可用时：preview 仍可运行（mode=deterministic），不得阻断 skill

## Tests

- [ ] Unit：`preferenceLearning.test.ts`
  - [ ] 空/过短 evidenceRef → ignored
  - [ ] 达阈值 → learned memory 생성
- [ ] E2E（Windows）`memory-preference-learning.spec.ts`
  - [ ] 开启 injection + learning（threshold=1）
  - [ ] 创建一条手动 preference
  - [ ] 运行 skill（fake AI）→ 断言 injected memory 包含该 preference（可通过 `ai:skill:run` 返回诊断字段断言）
  - [ ] `ai:skill:feedback accept`（带 evidenceRef）
  - [ ] 再次运行 skill → 断言 learned preference 被注入或至少出现在 preview
  - [ ] 关闭 injection → injected 为空（但模板结构稳定）

## Edge cases & Failure modes

- `runId` 不存在 → `NOT_FOUND`
- `evidenceRef` 过大/包含敏感信息 → privacy mode 下必须剔除或抽象化
- DB 错误 → `DB_ERROR`，不得 silent failure

## Observability

- `main.log` 必须记录：
  - `memory_create/update/delete`
  - `memory_injection_preview`（mode + count）
  - `preference_signal_ingested`（action + ignored/learned）
