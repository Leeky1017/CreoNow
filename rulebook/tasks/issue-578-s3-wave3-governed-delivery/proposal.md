# Proposal: issue-578-s3-wave3-governed-delivery

## Why

Sprint3 Wave W3 包含 `s3-hybrid-rag`、`s3-zen-mode`、`s3-project-templates` 三个并行 change。需要由主会话统一审计子代理产出、修正偏差并以单一总控分支完成治理收口，确保 OpenSpec + Rulebook + GitHub 门禁一致。

## What Changes

- 并行集成并审计 `#579/#580/#581` 三个子任务分支。
- 在主会话执行 fresh verification，确认 Scenario 测试与受影响回归通过。
- 补齐 `ISSUE-579..ISSUE-581` 主会话审计结论。
- 归档完成的 W3 change（`s3-hybrid-rag`、`s3-zen-mode`、`s3-project-templates`）并同步 `openspec/changes/EXECUTION_ORDER.md`。
- 创建总控 RUN_LOG，完成 preflight、PR、auto-merge、main 对齐与 worktree 清理。

## Impact

- Affected specs:
  - `openspec/changes/archive/s3-hybrid-rag/**`
  - `openspec/changes/archive/s3-zen-mode/**`
  - `openspec/changes/archive/s3-project-templates/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `#579/#580/#581` 子任务实现与测试文件
  - `openspec/_ops/task_runs/ISSUE-578.md`
  - `openspec/_ops/task_runs/ISSUE-579.md`
  - `openspec/_ops/task_runs/ISSUE-580.md`
  - `openspec/_ops/task_runs/ISSUE-581.md`
  - `rulebook/tasks/issue-578-s3-wave3-governed-delivery/**`
- Breaking change: NO
- User benefit: W3 三个能力在统一治理路径下一次性完成并可追溯收口，降低后续漂移风险。
