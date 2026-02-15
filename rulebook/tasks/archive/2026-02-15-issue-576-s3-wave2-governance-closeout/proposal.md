# Proposal: issue-576-s3-wave2-governance-closeout

## Why

Sprint3 Wave2 代码交付已经在 `#573` 合并且 `#575` 完成 post-merge 修复，但对应 Rulebook 任务仍存在 `pending/in_progress` 与未归档状态，导致治理视图与真实交付状态漂移，无法判定“彻底收尾”。

## What Changes

- 对 `issue-563..571` 与 `issue-574` 的 Rulebook `tasks.md` 做最小补齐，回填已完成的总控交付步骤。
- 将上述 Rulebook tasks 统一标记为 `completed` 并归档到 `rulebook/tasks/archive/`。
- 新增 `ISSUE-576` RUN_LOG，记录盘点、修正、验证、PR 与 main 收口证据。

## Impact

- Affected specs:
  - `rulebook/tasks/issue-563..571*/**`
  - `rulebook/tasks/issue-574-post-merge-lint-ratchet-fix/**`
  - `rulebook/tasks/issue-576-s3-wave2-governance-closeout/**`
- Affected code:
  - `openspec/_ops/task_runs/ISSUE-576.md`
- Breaking change: NO
- User benefit: Wave2 治理状态与 GitHub 合并事实一致，交付闭环可审计且可复核。
