# Proposal: issue-489-persist-phase2-openspec-drafts

## Why

当前仓库存在一批未提交的 OpenSpec Phase-2 变更草案（6 个 active change + `EXECUTION_ORDER.md` 更新）。如果不按治理流程收口，这些内容会长期停留在本地工作区，无法成为可追溯、可审计、可复用的团队资产。

## What Changes

- 将当前未提交变更迁移到规范分支 `task/489-persist-phase2-openspec-drafts` 并持久化。
- 建立并验证 Rulebook 任务 `issue-489-persist-phase2-openspec-drafts`。
- 建立 RUN_LOG `openspec/_ops/task_runs/ISSUE-489.md`，记录关键命令与结果。
- 通过 PR + auto-merge 将改动收口到 `main`，确保与 required checks 对齐。

## Impact

- Affected specs:
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/changes/p2-kg-context-level/**`
  - `openspec/changes/p2-kg-aliases/**`
  - `openspec/changes/p2-entity-matcher/**`
  - `openspec/changes/p2-fetcher-always/**`
  - `openspec/changes/p2-fetcher-detected/**`
  - `openspec/changes/p2-memory-injection/**`
- Affected code: none（本任务仅持久化规范与治理文档）
- Breaking change: NO
- User benefit: 当前改动从“本地暂存状态”升级为“已合并主干的可追溯资产”
