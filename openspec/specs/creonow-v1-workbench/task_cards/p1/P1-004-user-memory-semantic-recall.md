# P1-004: User Memory Semantic Recall（`user_memory_vec` + fallback）

Status: done

## Goal

为 user_memory 增加语义召回（sqlite-vec `vec0`）：支持 `memory:injection:preview(queryText)` 的 semantic 模式，并严格保护 `stablePrefixHash`（query-dependent 内容只能进入动态层）；同时提供明确降级策略（sqlite-vec/embedding 不可用时不阻断技能）。

## Dependencies

- Design: `../design/05-memory-system.md`（preview + fallback 口径）
- Design: `../design/04-context-engineering.md`（stablePrefixHash 边界）
- Design: `../design/07-search-embedding-rag.md`（embedding/vector store 风险）
- P0-009: `../p0/P0-009-memory-crud-injection-preview-preference-learning.md`

## Expected File Changes

| 操作   | 文件路径                                                                                           |
| ------ | -------------------------------------------------------------------------------------------------- |
| Update | `apps/desktop/main/src/db/migrations/*.sql`（`user_memory_vec` vec0 表 + dimension 保存）          |
| Update | `apps/desktop/main/src/services/memory/memoryService.ts`（preview 支持 queryText + semantic 排序） |
| Add    | `apps/desktop/main/src/services/memory/userMemoryVec.ts`（索引维护 + topK 查询）                   |
| Add    | `apps/desktop/tests/integration/user-memory-vec.spec.ts`                                           |
| Add    | `apps/desktop/tests/e2e/memory-semantic-recall.spec.ts`                                            |

## Acceptance Criteria

- [x] `memory:injection:preview` 支持 `queryText?`
- [x] 语义召回结果不影响 `stablePrefixHash`（只进入动态层）
- [x] sqlite-vec/embedding 不可用时：
  - [x] preview 回退 deterministic（mode=deterministic）
  - [x] skill 仍可运行
- [x] dimension 冲突返回 `CONFLICT`（并给出可恢复建议）

## Tests

- [x] Integration：
  - [x] vec0 创建成功 + topK 可用
  - [x] dimension 冲突 → `CONFLICT`
- [x] E2E（Windows）：
  - [x] 改变 queryText → stablePrefixHash 不变（需要 `ai:skill:run` 返回 hash 诊断字段）

## Edge cases & Failure modes

- vec 扩展加载失败 → 降级并记录 reason
- 召回结果过长 → 受 token budget 裁剪并留证据

## Observability

- `main.log`：`memory_semantic_recall`（mode + topK + reason?）

## Completion

- Issue: #54
- PR: #55
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-54.md`
