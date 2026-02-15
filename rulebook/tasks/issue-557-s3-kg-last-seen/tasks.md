## 1. Implementation

- [x] 1.1 为 `kg_entities` 增加 `last_seen_state` migration（可空）并接入 `db/init.ts`
- [x] 1.2 打通 KG 实体服务与 IPC 合同的 `lastSeenState` 读写映射
- [x] 1.3 打通 Renderer KG 编辑态 `lastSeenState` 展示与保存链路

## 2. Testing

- [x] 2.1 S3-KGLS-S1：`kgWriteService.last-seen.test.ts`（写入并读回）
- [x] 2.2 S3-KGLS-S2：`kgEntity.compatibility.test.ts`（历史空值兼容）
- [x] 2.3 UI 聚焦：`KnowledgeGraphPanel.last-seen-state.test.tsx`
- [x] 2.4 相关回归：KG aliases/context-level + `apps/desktop` typecheck

## 3. Governance

- [x] 3.1 更新 `openspec/changes/s3-kg-last-seen/tasks.md` 勾选状态
- [x] 3.2 更新 RUN_LOG `openspec/_ops/task_runs/ISSUE-557.md`（含 Red/Green 与 Dependency Sync）
- [x] 3.3 Rulebook task validate 通过
