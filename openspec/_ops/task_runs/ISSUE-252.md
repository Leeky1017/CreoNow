# ISSUE-252

- Issue: #252
- Branch: task/252-openspec-change-archive-hard-gate
- PR: https://github.com/Leeky1017/CreoNow/pull/253

## Plan

- 归档所有已完成 IPC P0 change。
- 将“完成 change 必须归档”固化到 preflight 与 `openspec-log-guard` 硬门禁。
- 更新交付文档并通过本地验证后创建 PR 自动合并。

## Runs

### 2026-02-07 16:31 +0000 issue & task bootstrap

- Command: `gh issue create --title "[Governance] archive completed OpenSpec changes and enforce archive gate" ...`
- Key output: `https://github.com/Leeky1017/CreoNow/issues/252`
- Command: `rulebook task create issue-252-openspec-change-archive-hard-gate`
- Key output: `Task ... created successfully`
- Command: `rulebook task validate issue-252-openspec-change-archive-hard-gate`
- Key output: `Task ... is valid`

### 2026-02-07 16:33 +0000 worktree setup

- Command: `scripts/agent_worktree_setup.sh 252 openspec-change-archive-hard-gate`
- Key output: `Worktree created: .worktrees/issue-252-openspec-change-archive-hard-gate`

### 2026-02-07 16:34 +0000 apply changes archive + hard gate

- Command: `mv openspec/changes/ipc-p0-* openspec/changes/archive/`
- Key output: IPC 三个已完成 change 已迁移到 archive。
- Command: `edit scripts/agent_pr_preflight.py / .github/workflows/openspec-log-guard.yml / docs/delivery-skill.md / scripts/README.md`
- Key output: 新增“完成变更未归档即阻断”校验。

### 2026-02-07 16:36 +0000 environment gate

- Command: `pnpm install --frozen-lockfile`
- Key output: `Lockfile is up to date ... Done in 2s`

### 2026-02-07 16:37 +0000 validation

- Command: `python3 -m py_compile scripts/agent_pr_preflight.py`
- Key output: `exit 0`
- Command: `python3 - <<'PY' ... validate_no_completed_active_changes(...)`
- Key output: `(skip) active change archive check: no active changes` + `archive_gate_ok`
- Command: `pnpm typecheck && pnpm lint && pnpm contract:check && pnpm test:unit`
- Key output: 全部通过；`lint` 仅 4 条既有 warning（0 errors）。
- Command: `scripts/agent_pr_preflight.sh`
- Key output: 失败：`[RUN_LOG] PR field still placeholder ... ISSUE-252.md: (待回填)`（符合预期，待 PR 创建后自动回填）
