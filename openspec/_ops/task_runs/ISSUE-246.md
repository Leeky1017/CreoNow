# ISSUE-246

- Issue: #246
- Branch: task/246-fresh-issue-worktree-governance
- PR: (待回填)

## Plan

- 强化治理规则：禁止复用历史/已关闭 Issue，要求从最新 `origin/main` 新建 worktree。
- 将规则落到 preflight 与 auto-merge 脚本，减少重复返工。
- 回填 `ISSUE-244` 的 PR 真实链接，修复历史不合规项。

## Runs

### 2026-02-07 23:17 +0000 issue & worktree bootstrap

- Command: `gh issue create --title "[Governance] enforce fresh issue/worktree and delivery anti-rework guards" ...`
- Key output: `https://github.com/Leeky1017/CreoNow/issues/246`
- Command: `scripts/agent_worktree_setup.sh 246 fresh-issue-worktree-governance`
- Key output: `Worktree created: .worktrees/issue-246-fresh-issue-worktree-governance`
- Command: `rulebook task create issue-246-fresh-issue-worktree-governance`
- Key output: `Task issue-246-fresh-issue-worktree-governance created successfully`
- Command: `rulebook task validate issue-246-fresh-issue-worktree-governance`
- Key output: `Task issue-246-fresh-issue-worktree-governance is valid`

### 2026-02-07 23:21 +0000 retrospective（不符合项与纠偏）

- 不符合项 A：任务初始阶段误引用历史 Issue `#17`（已关闭），不符合“当前 OPEN Issue 执行当前任务”要求。
- 纠偏：改为新建 Issue `#244`，并在本任务中将该规则提升为文档硬约束 + preflight 机器门禁。
- 不符合项 B：`openspec/_ops/task_runs/ISSUE-244.md` 的 `PR` 字段曾为占位符。
- 纠偏：本分支回填真实 PR 链接，并增强 auto-merge 脚本自动回填以避免再次遗漏。

### 2026-02-07 23:24 +0000 Red: new guardrail evidence

- Command: `scripts/agent_pr_preflight.sh`
- Key output: `PRE-FLIGHT FAILED: [RUN_LOG] PR field still placeholder ... ISSUE-246.md: (待回填)`
- 结论：新门禁生效，能阻断占位符 RUN_LOG 进入交付。

### 2026-02-07 23:25 +0000 local verification

- Command: `pnpm install --frozen-lockfile`
- Key output: `Done`
- Command: `pnpm typecheck`
- Key output: `exit 0`
- Command: `pnpm lint`
- Key output: `0 errors, 4 warnings`（已有 warnings，非本次引入）
