# ISSUE-522

- Issue: #522
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/522
- Branch: task/522-sprint0-batch-delivery
- PR: (pending)
- Scope: Sprint0 8 个 OpenSpec changes 一次性治理交付并合并到控制面 `main`
- Out of Scope: Sprint0 代码实现与测试修复（本任务仅交付变更文档与治理工件）

## Plan

- [x] 创建单一总 Issue 与隔离 worktree 分支
- [x] 迁移本地 Sprint0 changes 到 `task/522-sprint0-batch-delivery`
- [x] 创建 Rulebook task 并补齐 proposal/tasks/spec
- [ ] 完成 preflight、PR、auto-merge、main 同步与 worktree 清理

## Runs

### 2026-02-14 11:52 准入与单 Issue 建立

- Command:
  - `gh issue create --repo Leeky1017/CreoNow --title "Deliver Sprint0 OpenSpec changes in one governed batch" ...`
- Exit code: `0`
- Key output:
  - 创建 OPEN issue：`#522`
  - URL：`https://github.com/Leeky1017/CreoNow/issues/522`

### 2026-02-14 11:53 控制面改动迁移与隔离分支建立

- Command:
  - `git stash push -u -m 'issue-522-sprint0-batch-delivery'`
  - `scripts/agent_worktree_setup.sh 522 sprint0-batch-delivery`
  - `(cd .worktrees/issue-522-sprint0-batch-delivery && git stash pop stash@{0})`
- Exit code: `0`
- Key output:
  - 创建 worktree：`.worktrees/issue-522-sprint0-batch-delivery`
  - 创建分支：`task/522-sprint0-batch-delivery`
  - Sprint0 changes 成功迁移到隔离分支

### 2026-02-14 11:55 环境与 Rulebook 任务准备

- Command:
  - `pnpm install --frozen-lockfile`
  - `rulebook task create issue-522-sprint0-batch-delivery`
  - `rulebook task validate issue-522-sprint0-batch-delivery`
- Exit code: `0`
- Key output:
  - 依赖安装完成（lockfile frozen）
  - Rulebook task 创建并通过 validate
