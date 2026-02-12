# Proposal: issue-469-p1-chat-skill-closeout

## Why

`openspec/changes/p1-chat-skill` 已在代码层实现，但 change 文档仍停留在未勾选状态，未完成 Red/Green/Refactor/Evidence 闭环，也尚未归档到 `openspec/changes/archive/`。若不做收口，会违反 OpenSpec 的“完成后必须归档”和交付证据落盘要求，导致门禁与治理状态不一致。

## What Changes

- 复核 `p1-chat-skill` 的 Scenario 与现有实现/测试一致性。
- 补全 `openspec/changes/p1-chat-skill/tasks.md` 的 3~6 章节内容并完成勾选。
- 将已完成 change 从活跃目录归档至 `openspec/changes/archive/p1-chat-skill/`。
- 同步更新 `openspec/changes/EXECUTION_ORDER.md`（活跃数量、顺序、更新时间）。
- 新增 `openspec/_ops/task_runs/ISSUE-469.md` 记录本次 closeout 证据。
- 完成 preflight、PR、auto-merge、main 收口，并归档当前 Rulebook task。

## Impact

- Affected specs:
  - `openspec/changes/p1-chat-skill/proposal.md`
  - `openspec/changes/p1-chat-skill/tasks.md`
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/changes/archive/p1-chat-skill/**`（归档后路径）
- Affected code:
  - 无新增功能代码（仅交付收口与治理文件）
- Breaking change: NO
- User benefit: `p1-chat-skill` 从“已实现未收口”转为“可审计、可追踪、已归档”的完整交付状态。
