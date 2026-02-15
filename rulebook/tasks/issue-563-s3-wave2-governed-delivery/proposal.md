# Proposal: issue-563-s3-wave2-governed-delivery

## Why

Sprint3 Wave W2 共有 8 个并行 change，必须以主会话统一审计并集成交付，确保每个子任务都满足 Spec-first、TDD、证据落盘和门禁一致，再由单一集成 PR 合并回 `main`。

## What Changes

- 并行执行并审计 `s3-state-extraction`、`s3-synopsis-injection`、`s3-embedding-service`、`s3-entity-completion`、`s3-i18n-extract`、`s3-search-panel`、`s3-export`、`s3-p3-backlog-batch`。
- 在总控分支集成 8 个子分支提交并进行 Fresh Verification。
- 统一补齐 `ISSUE-564..ISSUE-571` 主会话审计字段。
- 将 8 个已完成 change 归档到 `openspec/changes/archive/` 并更新 `openspec/changes/EXECUTION_ORDER.md`。
- 创建总控 RUN_LOG、执行 preflight、PR、auto-merge、main 同步与清理。

## Impact

- Affected specs:
  - `openspec/changes/archive/s3-*`（W2 八个 change）
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - W2 八个 change 对应实现与测试文件
  - `openspec/_ops/task_runs/ISSUE-563.md` 与 `ISSUE-564..ISSUE-571.md`
  - `rulebook/tasks/issue-563-s3-wave2-governed-delivery/**`
- Breaking change: NO
- User benefit: W2 全量能力一次性通过治理门禁并可追溯合并到主线，降低后续 W3 执行风险。
