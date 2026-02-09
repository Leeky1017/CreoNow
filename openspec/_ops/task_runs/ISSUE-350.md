# ISSUE-350

- Issue: #350
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/350
- Branch: task/350-self-archive-nonrecursive-governance
- PR: https://github.com/Leeky1017/CreoNow/pull/351
- Scope: 落地 Option A（同 PR 自归档）：preflight 支持当前 Rulebook task 在 active/archive 双路径，更新治理规则文档并消除 closeout 递归
- Out of Scope: 业务功能变更；主模块 runtime 行为改动

## Plan

- [x] 准入：创建 OPEN issue + task branch + worktree
- [x] Rulebook task 创建并 validate 通过
- [x] Red：新增 preflight 回归测试并验证失败
- [x] Green：实现 active/archive 双路径解析并通过测试
- [x] 文档对齐：`docs/delivery-skill.md`、`AGENTS.md`、`scripts/README.md`
- [x] 本任务 Rulebook task 同 PR 自归档
- [ ] preflight 全绿
- [ ] PR + required checks + auto-merge + main 收口
- [ ] worktree 清理

## Runs

### 2026-02-09 20:38 +0800 准入

- Command:
  - `gh issue create --title "Harden governance to allow same-PR self-archive and stop closeout recursion" ...`
  - `scripts/agent_worktree_setup.sh 350 self-archive-nonrecursive-governance`
  - `rulebook task create issue-350-self-archive-nonrecursive-governance`
  - `rulebook task validate issue-350-self-archive-nonrecursive-governance`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`#350`
  - worktree 创建成功：`.worktrees/issue-350-self-archive-nonrecursive-governance`
  - Rulebook task admission 通过

### 2026-02-09 20:39 +0800 Red（失败测试证据）

- Command:
  - `python3 -m unittest scripts/tests/test_agent_pr_preflight.py -v`
- Exit code: `1`
- Key output:
  - 4 个用例全部报错：`AttributeError: module 'agent_pr_preflight' has no attribute 'resolve_rulebook_task_location'`

### 2026-02-09 20:40 +0800 Green（实现 + 回归）

- Command:
  - `apply_patch scripts/agent_pr_preflight.py`
  - `python3 -m unittest scripts/tests/test_agent_pr_preflight.py -v`
- Exit code: `0`
- Key output:
  - 新增 `resolve_rulebook_task_location` 与 archive 结构校验逻辑
  - 4 个回归用例全部通过

### 2026-02-09 20:43 +0800 规则文档对齐

- Command:
  - `apply_patch docs/delivery-skill.md`
  - `apply_patch AGENTS.md`
  - `apply_patch scripts/README.md`
- Exit code: `0`
- Key output:
  - 增加“Rulebook 自归档无递归”约束
  - 明确当前任务可 `active/archive` 双路径通过 preflight

### 2026-02-09 20:44 +0800 同 PR 自归档验证

- Command:
  - `rulebook task archive issue-350-self-archive-nonrecursive-governance`
  - `find rulebook/tasks ... | rg issue-350-self-archive-nonrecursive-governance`
  - `find rulebook/tasks/archive ... | rg issue-350-self-archive-nonrecursive-governance`
- Exit code: `0`
- Key output:
  - active 目录无 `issue-350-self-archive-nonrecursive-governance`
  - archive 目录存在 `2026-02-09-issue-350-self-archive-nonrecursive-governance`
