# ISSUE-256

- Issue: #256
- Branch: task/256-archive-issue-254-and-harden-change-archive-gate
- PR: https://github.com/Leeky1017/CreoNow/pull/257

## Plan

- 将已完成的 `issue-254` Rulebook task 归档入库。
- 明确并固化门禁提示文案：`tasks.md` 全部勾选完成即视为 completed，必须归档 change。
- 通过 preflight 与 required checks 后自动合并。

## Runs

### 2026-02-08 01:14 +0800 issue & task bootstrap

- Command: `gh issue create --title "[Governance] archive issue-254 task and codify completed-change criterion" ...`
- Key output: `https://github.com/Leeky1017/CreoNow/issues/256`
- Command: `rulebook task create issue-256-archive-issue-254-and-harden-change-archive-gate`
- Key output: `Task ... created successfully`
- Command: `rulebook task validate issue-256-archive-issue-254-and-harden-change-archive-gate`
- Key output: `Task ... is valid`

### 2026-02-08 01:14 +0800 worktree setup

- Command: `scripts/agent_worktree_setup.sh 256 archive-issue-254-and-harden-change-archive-gate`
- Key output: `Worktree created: .worktrees/issue-256-archive-issue-254-and-harden-change-archive-gate`

### 2026-02-08 01:15 +0800 archive + gate wording alignment

- Command: `rulebook task archive issue-254-ipc-next-three-requirement-changes`
- Key output: `Task ... archived successfully`
- Command: `edit scripts/agent_pr_preflight.py .github/workflows/openspec-log-guard.yml`
- Key output: completed-change 门禁提示统一为“tasks.md 全部勾选完成即必须归档”。

### 2026-02-08 01:16 +0800 validation baseline

- Command: `rulebook task validate issue-256-archive-issue-254-and-harden-change-archive-gate`
- Key output: `Task ... is valid`
- Command: `python3 -c 'from scripts.agent_pr_preflight import validate_no_completed_active_changes ...'`
- Key output: completed-active-change guard 函数执行通过
- Command: `pnpm install --frozen-lockfile`
- Key output: `Lockfile is up to date ... Done`
