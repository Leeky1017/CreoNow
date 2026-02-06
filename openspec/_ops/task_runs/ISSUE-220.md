# ISSUE-220

- Issue: #220
- Branch: `task/220-p0-005-ci-desktop-vitest`
- PR: https://github.com/Leeky1017/CreoNow/pull/221

## Goal

- 完成 Preflight 设计路径统一，并在 CI `check` job 增加 desktop Vitest 门禁。

## Status

- CURRENT: PR 已创建并回填，等待 checks + auto-merge。

## Next Actions

- [x] 运行本 Issue 最小门禁（typecheck/lint/contract:check/test:unit）。
- [x] 提交 commit（message 含 `(#220)`）并推送。
- [ ] 监控 `ci`/`openspec-log-guard`/`merge-serial` 并确认 auto-merge 后 `mergedAt != null`。

## Decisions Made

- 2026-02-06: 采用独立干净 clone (`/home/leeky/work/CreoNow-delivery`) 作为控制面，避免污染用户已有脏工作区。
- 2026-02-06: Preflight 路径统一改为 `design/system/README.md + design/system/01-tokens.css + design/DESIGN_DECISIONS.md`。

## Errors Encountered

- 2026-02-06: `scripts/agent_controlplane_sync.sh` 在原工作区失败（控制面脏）。处理：切换到干净 clone 执行标准流程。
- 2026-02-06: 首次 preflight 失败，`pnpm exec prettier` 不存在。处理：在 worktree 执行 `pnpm install --frozen-lockfile`。
- 2026-02-06: 二次 preflight 失败，Prettier 检查未通过。处理：对改动文件执行 `pnpm exec prettier --write` 后重跑 preflight。
- 2026-02-06: `gh pr create` 使用内联 body 时，反引号触发 shell 命令替换导致 PR body 污染。处理：改用 `--body-file` 并 `gh pr edit` 清理正文。

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

### 2026-02-06 00:00 Commit, push, and PR creation

- Command:
  - `git commit -m "chore: normalize remediation design baseline and CI gate (#220)"`
  - `git push -u origin HEAD`
  - `gh pr create ...`
  - `gh pr edit 221 --body-file /tmp/pr-220-clean.md`
- Key output:
  - Commit `ed4b2eb` created with required `(#220)` marker.
  - Branch `task/220-p0-005-ci-desktop-vitest` pushed to origin.
  - PR `#221` created and corrected with clean body including `Closes #220`.
- Evidence:
  - `https://github.com/Leeky1017/CreoNow/pull/221`
