# Proposal: issue-557-s3-kg-last-seen

## Why

Sprint 3 `s3-kg-last-seen` 要求为 KG 实体补齐 `lastSeenState`（TS）↔ `last_seen_state`（DB）映射，作为后续状态提取回写的稳定承载字段。当前链路缺失该字段，导致状态无法稳定存取。

## What Changes

- 新增 migration：`kg_entities.last_seen_state`（可空）。
- 扩展 KG 实体读写与 IPC 合同：支持 `lastSeenState`。
- 扩展 Renderer KG 实体编辑路径：展示空态并允许更新 `lastSeenState`。
- 增加 S1/S2 对应测试：写回读回、历史兼容（空值）。

## Impact

- Affected specs:
  - `openspec/changes/s3-kg-last-seen/specs/knowledge-graph-delta.md`
- Affected code:
  - `apps/desktop/main/src/db/migrations/0020_kg_last_seen_state.sql`
  - `apps/desktop/main/src/services/kg/**`
  - `apps/desktop/main/src/ipc/**`
  - `apps/desktop/renderer/src/features/kg/**`
  - `apps/desktop/renderer/src/stores/kgStore.ts`
  - `packages/shared/types/ipc-generated.ts`
- Breaking change: NO
