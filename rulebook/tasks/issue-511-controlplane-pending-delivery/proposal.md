# Proposal: issue-511-controlplane-pending-delivery

## Why

控制面 `main` 上存在未提交的集成检查文档重构与运行日志补录改动，需按 OpenSpec + Rulebook + GitHub 治理流程完成正式交付，避免本地漂移与证据丢失。

## What Changes

- 交付 `docs/plans/p1p2-integration-check.md` 的结构化重构版本（未完成优先、已完成其次、索引与证据分区）。
- 交付 `openspec/_ops/task_runs/ISSUE-505.md` 的补充执行证据（集成复核与真实 LLM 抽检记录）。
- 使用独立 task worktree 完成提交、PR、门禁校验与自动合并。

## Impact

- Affected specs: 无主 spec 行为变更（文档与证据更新）
- Affected code: `docs/plans/p1p2-integration-check.md`, `openspec/_ops/task_runs/ISSUE-505.md`
- Breaking change: NO
- User benefit: 集成状态可检索、优先级清晰、证据完整可追溯
