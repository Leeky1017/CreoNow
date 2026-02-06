# ISSUE-220

- Issue: #220
- Branch: `task/220-p0-005-ci-desktop-vitest`
- PR: <pending>

## Goal

- 完成 Preflight 设计路径统一，并在 CI `check` job 增加 desktop Vitest 门禁。

## Status

- CURRENT: 门禁验证已通过，正在提交并创建 PR。

## Next Actions

- [x] 运行本 Issue 最小门禁（typecheck/lint/contract:check/test:unit）。
- [ ] 提交 commit（message 含 `(#220)`）并推送。
- [ ] 创建 PR（body 含 `Closes #220`），启用 auto-merge 并等待合并。

## Decisions Made

- 2026-02-06: 采用独立干净 clone (`/home/leeky/work/CreoNow-delivery`) 作为控制面，避免污染用户已有脏工作区。
- 2026-02-06: Preflight 路径统一改为 `design/system/README.md + design/system/01-tokens.css + design/DESIGN_DECISIONS.md`。

## Errors Encountered

- 2026-02-06: `scripts/agent_controlplane_sync.sh` 在原工作区失败（控制面脏）。处理：切换到干净 clone 执行标准流程。
- 2026-02-06: 首次 preflight 失败，`pnpm exec prettier` 不存在。处理：在 worktree 执行 `pnpm install --frozen-lockfile`。
- 2026-02-06: 二次 preflight 失败，Prettier 检查未通过。处理：对改动文件执行 `pnpm exec prettier --write` 后重跑 preflight。

## Runs

### 2026-02-06 00:00 Preflight auth and scripts

- Command:
  - `gh auth status`
  - `git remote -v`
  - `ls -1 scripts`
- Key output:
  - GitHub account `Leeky1017` authenticated.
  - `origin` remote configured.
  - Required delivery scripts are present.
- Evidence:
  - `scripts/agent_controlplane_sync.sh`
  - `scripts/agent_worktree_setup.sh`

### 2026-02-06 00:00 Issue and worktree bootstrap

- Command:
  - `gh issue create -t "[MVP-REMED] P0-005: CI add desktop vitest gate" ...`
  - `scripts/agent_worktree_setup.sh 220 p0-005-ci-desktop-vitest`
  - `rulebook task create issue-220-p0-005-ci-desktop-vitest`
  - `rulebook task validate issue-220-p0-005-ci-desktop-vitest`
- Key output:
  - Created issue `#220`.
  - Worktree created at `.worktrees/issue-220-p0-005-ci-desktop-vitest`.
  - Rulebook task created and validated.
- Evidence:
  - `rulebook/tasks/issue-220-p0-005-ci-desktop-vitest/`

### 2026-02-06 00:00 Apply scoped file changes

- Command:
  - `cp` (from `/home/leeky/work/CreoNow`) into N1 worktree for 4 scoped files
- Key output:
  - Updated files:
    - `.github/workflows/ci.yml`
    - `openspec/specs/creonow-mvp-readiness-remediation/spec.md`
    - `openspec/specs/creonow-mvp-readiness-remediation/task_cards/index.md`
    - `openspec/specs/creonow-mvp-readiness-remediation/task_cards/p0/P0-001-dashboard-project-actions-rename-duplicate-archive.md`
- Evidence:
  - `git status --short`

### 2026-02-06 00:00 Resolve preflight blockers and verify

- Command:
  - `scripts/agent_pr_preflight.sh`
  - `pnpm install --frozen-lockfile || pnpm install`
  - `pnpm exec prettier --write <changed files>`
  - `scripts/agent_pr_preflight.sh`
  - `rg -n "design/Variant/DESIGN_SPEC.md" openspec/specs/creonow-mvp-readiness-remediation/spec.md openspec/specs/creonow-mvp-readiness-remediation/task_cards/index.md openspec/specs/creonow-mvp-readiness-remediation/task_cards/p0/P0-001-dashboard-project-actions-rename-duplicate-archive.md || true`
- Key output:
  - First preflight failed due to missing `prettier` in workspace.
  - Second preflight failed on formatting drift, then passed after formatting.
  - Final preflight passed:
    - `pnpm typecheck` passed
    - `pnpm lint` passed (warnings only, no errors)
    - `pnpm contract:check` passed
    - `pnpm test:unit` passed
  - `rg` returned no matches in remediation scope for `design/Variant/DESIGN_SPEC.md`.
- Evidence:
  - `openspec/_ops/task_runs/ISSUE-220.md`
  - `rulebook/tasks/issue-220-p0-005-ci-desktop-vitest/tasks.md`

### 2026-02-06 00:00 Final preflight before commit

- Command:
  - `scripts/agent_pr_preflight.sh`
- Key output:
  - Preflight passed end-to-end.
  - `pnpm typecheck` passed.
  - `pnpm lint` passed with 4 pre-existing warnings and 0 errors.
  - `pnpm contract:check` passed.
  - `pnpm test:unit` passed.
- Evidence:
  - `scripts/agent_pr_preflight.sh` output (latest run)
