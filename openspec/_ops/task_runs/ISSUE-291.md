# ISSUE-291

- Issue: #291
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/291
- Branch: `task/291-project-management-p0-p1-changes`
- PR: https://github.com/Leeky1017/CreoNow/pull/293
- Scope: 为 `project-management` 模块创建 PM-1 与 PM-2 两个活跃 OpenSpec change，并维护执行顺序与交付证据
- Out of Scope: 生产代码实现、测试实现、delta apply/archive

## Goal

- 交付两个新 change：
  - `project-management-p0-creation-metadata-dashboard`
  - `project-management-p1-lifecycle-switch-delete`
- 每个 change 包含 `proposal.md`、`specs/project-management-delta.md`、`tasks.md`（固定 6 章节，checkbox 全未勾选）。
- 更新 `openspec/changes/EXECUTION_ORDER.md` 为串行依赖。
- 完成 Rulebook task 创建与 validate。

## Status

- CURRENT: 进行中（文档已创建，待校验、提交、PR、auto-merge、main 收口）。

## Runs

### 2026-02-08 19:41 +0800 control plane sync

- Command:
  - `git fetch origin && git status --short --branch`
- Exit code: `0`
- Key output:
  - `## main...origin/main`

### 2026-02-08 19:42 +0800 issue guardrail check

- Command:
  - `gh issue list --state open --limit 200`
- Exit code: `0`
- Key output:
  - 仅有 `#265`、`#266` 为 OPEN，未命中本任务入口。

### 2026-02-08 19:43 +0800 issue bootstrap

- Command:
  - `gh issue create --title "Project Management: draft PM-1 and PM-2 OpenSpec changes" --body "..."`
  - `gh issue edit 291 --body-file /tmp/issue-291-body.md`
- Exit code: `0`
- Key output:
  - `https://github.com/Leeky1017/CreoNow/issues/291`
- Note:
  - 首次 `issue create` 正文含反引号导致 shell 展开报错，已立即通过 `gh issue edit` 修正正文。

### 2026-02-08 19:45 +0800 worktree setup

- Command:
  - `git worktree add .worktrees/issue-291-project-management-p0-p1-changes -b task/291-project-management-p0-p1-changes origin/main`
- Exit code: `0`
- Key output:
  - `Preparing worktree (new branch 'task/291-project-management-p0-p1-changes')`
  - `HEAD is now at 34b490c9 ...`

### 2026-02-08 19:46 +0800 rulebook bootstrap

- Command:
  - `rulebook task create issue-291-project-management-p0-p1-change-specs`（MCP）
  - `rulebook task validate issue-291-project-management-p0-p1-change-specs`（MCP）
  - `rulebook task create issue-291-project-management-p0-p1-changes`（仓库本地）
  - `rulebook task validate issue-291-project-management-p0-p1-changes`
- Exit code: `0`
- Key output:
  - `Task issue-291-project-management-p0-p1-change-specs created successfully`
  - `Task issue-291-project-management-p0-p1-changes created successfully`
  - `Task issue-291-project-management-p0-p1-changes is valid`

### 2026-02-08 19:47 +0800 openspec authoring

- Command:
  - `create openspec/changes/project-management-p0-creation-metadata-dashboard/{proposal.md,specs/project-management-delta.md,tasks.md}`
  - `create openspec/changes/project-management-p1-lifecycle-switch-delete/{proposal.md,specs/project-management-delta.md,tasks.md}`
  - `copy specs/project-management-delta.md -> specs/project-management/spec.md (both changes)`
  - `edit openspec/changes/EXECUTION_ORDER.md`
  - `create openspec/_ops/task_runs/ISSUE-291.md`
- Exit code: `0`
- Key output:
  - 两个 change 文档已落盘，执行顺序改为串行并声明 PM-2 依赖 PM-1。

### 2026-02-08 19:56 +0800 commit + publish + pr

- Command:
  - `git commit -m "docs: draft PM-1 and PM-2 project management changes (#291)"`
  - `git push -u origin task/291-project-management-p0-p1-changes`
  - `gh pr create --base main --head task/291-project-management-p0-p1-changes --title "Draft PM-1 and PM-2 project management OpenSpec changes (#291)" --body ...`
  - `gh pr merge 293 --auto --squash`
- Exit code: `0`
- Key output:
  - commit: `5eb33612`
  - PR: `https://github.com/Leeky1017/CreoNow/pull/293`
  - PR 状态：`OPEN / AUTO-MERGE enabled`

### 2026-02-08 20:00 +0800 preflight(red-1)

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `PRE-FLIGHT FAILED: ... pnpm exec prettier --check ... rulebook/tasks/issue-291-project-management-p0-p1-changes/.metadata.json`
  - `Code style issues found ... .metadata.json`
- Fix:
  - 执行 `pnpm exec prettier --write rulebook/tasks/issue-291-project-management-p0-p1-changes/.metadata.json`

### 2026-02-08 20:01 +0800 preflight(red-2)

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `PRE-FLIGHT FAILED: command failed: pnpm typecheck (exit 1)`
  - `sh: 1: tsc: not found`
  - `Local package.json exists, but node_modules missing`
- Fix:
  - 执行 `pnpm install --frozen-lockfile` 补齐依赖

### 2026-02-08 20:02 +0800 preflight(green)

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `0`
- Key output:
  - `pnpm typecheck` 通过
  - `pnpm lint` 通过（4 条 warning，无 error）
  - `pnpm contract:check` 通过
  - `pnpm test:unit` 通过
