# Proposal: issue-414-version-control-p3-branch-merge-conflict

## Why
`version-control-p3-branch-merge-conflict` 是 Version Control 泳道从「快照/Diff/回滚」迈向「分支协作」的关键阶段。若缺失分支创建、切换、三方合并与冲突解决链路，创作者无法在不污染主线的前提下探索分叉写作方案，且 `version-control-p4` 的并发/边界硬化将失去稳定前置。

## What Changes
- 新增分支元数据与冲突会话持久化（SQLite migration + DAO 路径）。
- 新增 `version:branch:create/list/switch/merge` 与 `version:conflict:resolve` IPC 契约与 handler。
- 新增三方合并模块，覆盖无冲突自动合并、冲突块返回、超时错误 `VERSION_MERGE_TIMEOUT`。
- 新增 renderer 分支合并/冲突解决 UI（ours/theirs/manual），打通提交 `version:conflict:resolve`。
- 补齐 unit/contract/renderer 测试并完成 Red → Green 证据落盘。

## Impact
- Affected specs:
  - `openspec/changes/version-control-p3-branch-merge-conflict/**`
  - `openspec/specs/version-control/spec.md`（仅按主 spec 消费，不直接改主 spec）
- Affected code:
  - `apps/desktop/main/src/services/documents/documentService.ts`
  - `apps/desktop/main/src/services/documents/threeWayMerge.ts`
  - `apps/desktop/main/src/ipc/version.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/main/src/db/migrations/0017_version_branch_merge_conflict.sql`
  - `apps/desktop/renderer/src/stores/versionStore.tsx`
  - `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx`
  - `apps/desktop/tests/unit/version-branch-merge-conflict.ipc.test.ts`
- Breaking change: NO
- User benefit: 创作者可在单文档内进行分支试写、可控合并，并在冲突时逐块决策后安全落盘。
