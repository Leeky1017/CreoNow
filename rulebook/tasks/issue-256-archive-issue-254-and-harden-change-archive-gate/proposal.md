# Proposal: issue-256-archive-issue-254-and-harden-change-archive-gate

## Why

issue-254 已完成并合并，但 Rulebook 归档尚未入库。同时需把“完成 change 的判定标准”在门禁提示中明确为 `tasks.md` 全部勾选完成，避免执行歧义。

## What Changes

- 归档 `rulebook/tasks/issue-254-ipc-next-three-requirement-changes` 到 `rulebook/tasks/archive/`。
- 更新 preflight 与 `openspec-log-guard` 的提示文案，明确 completed 判定标准是 `tasks.md` 全部复选框均为已勾选。
- 保持现有阻断行为不变（仅增强可读性与一致性）。

## Impact

- Affected specs:
  - `rulebook/tasks/issue-256-archive-issue-254-and-harden-change-archive-gate/specs/governance/spec.md`
- Affected code:
  - `scripts/agent_pr_preflight.py`
  - `.github/workflows/openspec-log-guard.yml`
  - `rulebook/tasks/archive/2026-02-07-issue-254-ipc-next-three-requirement-changes/`
- Breaking change: NO
- User benefit: “完成即归档”的执行标准与门禁提示一致，减少漏归档和沟通成本。
