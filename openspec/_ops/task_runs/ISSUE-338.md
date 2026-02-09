# ISSUE-338

- Issue: #338
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/338
- Branch: task/338-governance-closeout-active-legacy
- PR: (pending)
- Scope: 收口 active governance 残留并归档历史关闭 issue 的 pending task（仅治理文档）
- Out of Scope: 运行时代码改动；`issue-266` 功能修复

## Plan

- [x] 准入：新建 OPEN issue + task branch + worktree
- [x] OpenSpec/Rulebook admission 文档建立
- [x] Dependency Sync Check（334/336 已合并 + 39/50 已关闭）
- [x] Red 证据记录
- [x] Green 归档与执行顺序更新
- [ ] PR + required checks + merge + main 收口

## Runs

### 2026-02-09 15:33 +0800 准入

- Command:
  - `gh issue create --title "Governance closeout: archive active changes and legacy pending rulebook tasks" ...`
  - `scripts/agent_worktree_setup.sh 338 governance-closeout-active-legacy`
  - `rulebook task create issue-338-governance-closeout-active-legacy`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`#338`
  - worktree 创建成功：`.worktrees/issue-338-governance-closeout-active-legacy`
  - Rulebook task 创建并 validate 通过

### 2026-02-09 15:34 +0800 Dependency Sync Check

- Inputs:
  - `openspec/changes/issue-334-archive-closeout-and-worktree-cleanup/*`
  - `openspec/changes/issue-336-rulebook-archive-issue-334/*`
  - `rulebook/tasks/issue-39-p0-008-context-engineering/*`
  - `rulebook/tasks/issue-50-p0-012-search-embedding-rag/*`
  - GitHub status: `issue #334/#336 CLOSED`, `issue #39/#50 CLOSED`
- Checks:
  - 数据结构：仅治理文档目录移动，无业务数据结构变更
  - IPC 契约：无通道/请求响应修改
  - 错误码：无错误码字典修改
  - 阈值：无性能阈值调整
- Conclusion:
  - `无漂移`，可进入 Red/Green 收口

### 2026-02-09 15:35 +0800 Red 证据

- Command:
  - `test -d openspec/changes/issue-334-archive-closeout-and-worktree-cleanup && echo CHANGE_334_ACTIVE`
  - `test -d openspec/changes/issue-336-rulebook-archive-issue-334 && echo CHANGE_336_ACTIVE`
  - `test -d rulebook/tasks/issue-39-p0-008-context-engineering && echo TASK_39_ACTIVE`
  - `test -d rulebook/tasks/issue-50-p0-012-search-embedding-rag && echo TASK_50_ACTIVE`
  - `rg -n "issue-336-rulebook-archive-issue-334|进行中" openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - active 目录命中：`CHANGE_334_ACTIVE`、`CHANGE_336_ACTIVE`、`TASK_39_ACTIVE`、`TASK_50_ACTIVE`
  - `EXECUTION_ORDER.md` 命中 `issue-336` 进行中状态

### 2026-02-09 15:36 +0800 Green 实施

- Command:
  - `rulebook task archive issue-336-rulebook-archive-issue-334`
  - `rulebook task archive issue-39-p0-008-context-engineering`
  - `rulebook task archive issue-50-p0-012-search-embedding-rag`
  - `git mv openspec/changes/issue-334-archive-closeout-and-worktree-cleanup openspec/changes/archive/issue-334-archive-closeout-and-worktree-cleanup`
  - `git mv openspec/changes/issue-336-rulebook-archive-issue-334 openspec/changes/archive/issue-336-rulebook-archive-issue-334`
  - `edit openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - 三个 Rulebook active task 归档成功
  - 两个 OpenSpec active change 已移动到 archive
  - 执行顺序文档已同步为当前活跃集合

### 2026-02-09 15:37 +0800 验证

- Command:
  - `rulebook task validate issue-338-governance-closeout-active-legacy`
  - `scripts/agent_pr_preflight.sh`
- Exit code: (pending)
- Key output:
  - (pending)
