# Proposal: issue-344-active-changes-delivery

## Why

当前仓库存在 17 个 active OpenSpec changes（AI/Context/Search/Governance）未持久化到 Git 历史；需要一次合规交付将文档草案纳入主干并完成 Rulebook + PR 门禁闭环。

## What Changes

- 持久化以下 active changes 文档（proposal/specs/tasks）：
  - `ai-service-p0..p5`
  - `context-engine-p0..p4`
  - `search-retrieval-p0..p4`
  - `issue-342-governance-archive-issue-340-closeout`（保留 active）
- 同步 `openspec/changes/EXECUTION_ORDER.md` 覆盖全部 active changes。
- 建立 `openspec/_ops/task_runs/ISSUE-344.md`，记录交付证据。

## Impact

- Affected specs: `openspec/changes/**`, `openspec/changes/EXECUTION_ORDER.md`
- Affected code: none（无运行时代码改动）
- Breaking change: NO
- User benefit: 活跃变更文档可追踪、可审计、可通过 GitHub required checks 合并到 main
