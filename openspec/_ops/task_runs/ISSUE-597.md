# ISSUE-597

- Issue: #597
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/597
- Branch: `task/597-aud-change-docs-archive`
- PR: (pending)
- Scope (Governance):
  - `openspec/changes/aud-*`
  - `openspec/changes/archive/aud-*`
  - `openspec/changes/EXECUTION_ORDER.md`
  - `rulebook/tasks/issue-597-aud-change-docs-archive/**`
  - `openspec/_ops/task_runs/ISSUE-597.md`

## Plan

- [ ] Create worktree from latest `origin/main`
- [ ] Create + validate Rulebook task
- [ ] Rewrite all `openspec/changes/aud-*` docs to archived-change quality
- [ ] Archive all `openspec/changes/aud-*` -> `openspec/changes/archive/`
- [ ] Update `openspec/changes/EXECUTION_ORDER.md` (active set = 0)
- [ ] Run agent preflight and fix blockers
- [ ] Create PR, enable auto-merge, required checks all green
- [ ] Post-merge: sync control-plane `main` and cleanup worktree

## Runs

### 2026-02-17 Bootstrap

- Command:
  - `git fetch origin main`
  - `git worktree add .worktrees/issue-597-aud-change-docs-archive -b task/597-aud-change-docs-archive origin/main`
  - `rulebook task create issue-597-aud-change-docs-archive`
  - `rulebook task validate issue-597-aud-change-docs-archive`
- Exit code: `0`
- Key output:
  - Worktree: `.worktrees/issue-597-aud-change-docs-archive`
  - Branch: `task/597-aud-change-docs-archive`
  - Rulebook validate: pass (warning: `No spec files found`)

