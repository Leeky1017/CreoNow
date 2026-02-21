# ISSUE-600

- Issue: #600
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/600
- Branch: `task/600-doc-reality-alignment`
- PR: (pending)
- Scope (Governance):
  - `README*.md`
  - `docs/**/*.md`
  - `openspec/project.md`
  - `openspec/specs/**`
  - `openspec/changes/**` (active only; archives are immutable)
  - `rulebook/tasks/issue-600-doc-reality-alignment/**`
  - `scripts/**` (timestamp gate)
  - `.github/workflows/**` (timestamp gate)
  - `openspec/_ops/task_runs/ISSUE-600.md`

## Plan

- [x] Read governance docs (`AGENTS.md`, `openspec/project.md`, `docs/delivery-skill.md`)
- [x] Create a fresh OPEN Issue (#600)
- [x] Create worktree from latest `origin/main`
- [x] Create + validate Rulebook task
- [x] Swarm task graph + role ownership confirmed
- [x] Repo truth baseline (code evidence)
- [x] Docs audit + triage (P0/P1/P2)
- [x] Apply doc fixes (by area) + timestamps where required
- [x] Timestamp governance policy + gate script + CI integration
- [ ] Run preflight and fix blockers
- [ ] Create PR, backfill RUN_LOG PR URL, enable auto-merge, required checks green
- [ ] Post-merge: sync control-plane `main`, cleanup worktree, archive Rulebook task

## Runs

### 2026-02-21 Bootstrap

- Command:
  - `gh auth status`
  - `gh issue create ...` (created #600)
  - `gh issue view 600 --json state,title,url`
  - `git fetch origin main && git merge --ff-only origin/main`
  - `git worktree add -b task/600-doc-reality-alignment .worktrees/issue-600-doc-reality-alignment origin/main`
  - `rulebook task create issue-600-doc-reality-alignment`
  - `rulebook task validate issue-600-doc-reality-alignment`
  - `gh api repos/Leeky1017/CreoNow/branches/main/protection --jq '.required_status_checks.contexts'`
- Exit code: `0`
- Key output:
  - Issue: `OPEN`
  - Worktree: `.worktrees/issue-600-doc-reality-alignment`
  - Branch: `task/600-doc-reality-alignment`
  - Rulebook validate: `pass` (warning: `No spec files found`)
  - Required checks (branch protection): `openspec-log-guard`, `ci`, `merge-serial`

### 2026-02-21 Repo Truth + Docs Alignment + Timestamp Gate

- Command:
  - `date '+%Y-%m-%d %H:%M'` (used as unified doc timestamp: `2026-02-21 11:57`)
  - `python3 scripts/check_doc_timestamps.py --files docs/references/toolchain.md` (expected fail)
  - `python3 scripts/check_doc_timestamps.py --files README.md docs/delivery-skill.md docs/PRODUCT_OVERVIEW.md docs/references/file-structure.md docs/references/document-timestamp-governance.md docs/audit/CN-doc-reality-alignment-ISSUE-600.md openspec/project.md rulebook/tasks/README.md rulebook/tasks/issue-600-doc-reality-alignment/proposal.md rulebook/tasks/issue-600-doc-reality-alignment/tasks.md` (expected pass)
- Exit code:
  - Red: `1`
  - Green: `0`
- Key output:
  - Red: `ERROR: missing/invalid doc timestamps...` (for `docs/references/toolchain.md`)
  - Green: `OK: validated timestamps for 10 governed markdown file(s)`
- Notes:
  - Alignment matrix/report: `docs/audit/CN-doc-reality-alignment-ISSUE-600.md`
  - Timestamp policy: `docs/references/document-timestamp-governance.md`
  - CI gate: `doc-timestamp-gate` integrated into required check `ci`

## Main Session Audit

- Audit-Owner: main-session
- Reviewed-HEAD-SHA: (pending)
- Spec-Compliance: TBD
- Code-Quality: TBD
- Fresh-Verification: TBD
- Blocking-Issues: TBD
- Decision: TBD
