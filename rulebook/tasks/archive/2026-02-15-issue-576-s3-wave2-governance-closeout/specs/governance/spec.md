# Spec Delta: issue-576-s3-wave2-governance-closeout

## Context

Sprint3 Wave2 已完成代码交付与主线合并，但 Rulebook 任务状态仍存在遗留 pending/in_progress，治理收口与实际交付状态不一致。

## Requirements

1. Wave2 相关 Rulebook tasks（`issue-563..571`）与 post-merge 修复 task（`issue-574`）必须与实际 merged 状态对齐。
2. 对已完成任务必须统一更新为 completed 并归档到 `rulebook/tasks/archive/`。
3. 收口过程必须在独立 issue/worktree 中完成并留存 RUN_LOG 证据。

## Acceptance

- `issue-563..571` 与 `issue-574` 不再出现在 active Rulebook 目录。
- 归档目录中存在对应任务完整结构（`.metadata.json`、`proposal.md`、`tasks.md`、`specs/**`）。
- `ISSUE-576` RUN_LOG 记录 PR、验证、合并与 main 对齐证据。
