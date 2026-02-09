# ISSUE-334

- Issue: #334
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/334
- Branch: task/334-archive-closeout-and-worktree-cleanup
- PR: TBD
- Scope: 归档已合并 change/task 并清理历史 worktree
- Out of Scope: 运行时代码改动

## Plan

- [x] 任务准入（OPEN issue + task branch + worktree）
- [x] OpenSpec / Rulebook 准入
- [x] 归档执行与验证
- [ ] PR + auto-merge + main 收口

## Runs

### 2026-02-09 14:20 任务准入

- Command:
  - `gh issue create --title "Archive pending OpenSpec/Rulebook closeout and clean local worktrees" ...`
  - `git worktree add .worktrees/issue-334-archive-closeout-and-worktree-cleanup -b task/334-archive-closeout-and-worktree-cleanup origin/main`
  - `pnpm install --frozen-lockfile`
  - `rulebook task create issue-334-archive-closeout-and-worktree-cleanup`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`#334`
  - worktree 创建成功

### 2026-02-09 14:22 依赖同步检查

- Inputs:
  - `openspec/changes/issue-326-*`, `issue-328-*`, `issue-330-*`, `issue-332-*`（均已 merge）
  - `rulebook/tasks/issue-326-*`, `issue-328-*`, `issue-330-*`, `issue-332-*`
- Conclusion:
  - 归档对象完整且无冲突，可进入归档执行。

### 2026-02-09 14:23-14:33 归档执行与清单更新

- Command:
  - `git mv openspec/changes/issue-326-* openspec/changes/archive/...`
  - `git mv openspec/changes/issue-328-* openspec/changes/archive/...`
  - `git mv openspec/changes/issue-330-* openspec/changes/archive/...`
  - `git mv openspec/changes/issue-332-* openspec/changes/archive/...`
  - `rulebook task archive issue-326-layer2-layer3-integration-gate`
  - `rulebook task archive issue-328-cross-module-contract-alignment-gate`
  - `rulebook task archive issue-330-cross-module-gate-autofix-classification`
  - `rulebook task archive issue-332-cross-module-drift-zero`
  - `edit openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - 4 个 change 已从活跃目录移入 `openspec/changes/archive/`
  - 4 个 Rulebook task 已归档到 `rulebook/tasks/archive/`
  - 活跃 change 收敛为 `issue-334`

### 2026-02-09 14:34 验证

- Command:
  - `rulebook task validate issue-334-archive-closeout-and-worktree-cleanup`
  - `ls openspec/changes`
  - `ls openspec/changes/archive | rg 'issue-(326|328|330|332)'`
  - `ls rulebook/tasks | rg '^issue-(326|328|330|332)' || true`
  - `ls rulebook/tasks/archive | rg 'issue-(326|328|330|332)'`
- Exit code: `0`
- Key output:
  - Rulebook validate 通过
  - `rulebook/tasks` 中不再存在 active 的 326/328/330/332
  - archive 目录存在 326/328/330/332 的归档条目
