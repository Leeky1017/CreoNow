# ISSUE-280

- Issue: #280
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/280
- Branch: `task/280-document-management-p1-reference-and-export`
- PR: TBD
- Scope: 完成 `document-management-p1-reference-and-export` 的 OpenSpec-only 收口（审批标注、任务完成、归档、执行顺序同步、合并回 main）
- Out of Scope: 生产代码实现（引用/导出功能编码与测试）

## Goal

- 在不修改主 spec 的前提下，完成批次 3 change 的收口交付。
- 保持 `tasks.md` 六段顺序，且每个 Scenario 仍有映射。
- 归档已完成 change，确保 `EXECUTION_ORDER.md` 与活跃 change 现状一致。
- 通过 preflight 与 PR auto-merge，最终同步控制面 `main`。

## Status

- CURRENT: 进行中（文档收口已完成，待归档 + preflight + PR 合并）。

## Plan

- 归档 `document-management-p1-reference-and-export`。
- 更新 `EXECUTION_ORDER.md`。
- 运行 Rulebook validate 与 preflight。
- 提交并执行 auto-merge。

## Runs

### 2026-02-08 16:52 +0800 issue bootstrap

- Command:
  - `gh issue create --title "[OpenSpec] Finalize document-management-p1-reference-and-export split + archive" --body ...`
- Exit code: `0`
- Key output:
  - `https://github.com/Leeky1017/CreoNow/issues/280`
- Note:
  - 首次命令受 shell 反引号展开影响，后续已修正 issue body。

### 2026-02-08 16:53 +0800 issue body remediation

- Command:
  - `gh issue edit 280 --body-file /tmp/issue-280-body.md`
- Exit code: `0`
- Key output:
  - `https://github.com/Leeky1017/CreoNow/issues/280`

### 2026-02-08 16:55 +0800 worktree setup

- Command:
  - `scripts/agent_worktree_setup.sh 280 document-management-p1-reference-and-export`
- Exit code: `0`
- Key output:
  - `Worktree created: .worktrees/issue-280-document-management-p1-reference-and-export`
  - `Branch: task/280-document-management-p1-reference-and-export`

### 2026-02-08 16:56 +0800 change closeout (openspec)

- Command:
  - `mv openspec/changes/document-management-p1-reference-and-export openspec/changes/archive/`
  - `edit openspec/changes/archive/document-management-p1-reference-and-export/{proposal.md,tasks.md}`
  - `edit openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - `document-management-p1-reference-and-export` 已归档
  - 活跃 change 数量由 `4` 更新为 `3`

### 2026-02-08 16:57 +0800 rulebook validate + preflight

- Command:
  - `rulebook task validate issue-280-document-management-p1-reference-and-export`
  - `scripts/agent_pr_preflight.sh`
- Exit code: `0`（validate）/ `1`（preflight）
- Key output:
  - `Task ... is valid`
  - `PRE-FLIGHT FAILED: [RUN_LOG] PR field still placeholder ... ISSUE-280.md: TBD`
- Note:
  - 将通过 PR 创建后回填真实链接，再次执行 preflight 直至通过。
