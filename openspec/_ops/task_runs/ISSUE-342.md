# ISSUE-342

- Issue: #342
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/342
- Branch: task/342-governance-archive-issue-340-closeout
- PR: https://github.com/Leeky1017/CreoNow/pull/343
- Scope: 归档已合并 active change（issue-340）及对应 Rulebook active task（仅治理文档）
- Out of Scope: 运行时代码改动；功能行为变更

## Plan

- [x] 准入：创建 OPEN issue + task branch + worktree
- [x] OpenSpec/Rulebook admission 文档建立
- [x] Dependency Sync Check（`#341` 已合并事实核对）
- [x] Red 证据记录
- [x] Green 归档与执行顺序更新
- [ ] PR + required checks + merge + main 收口

## Runs

### 2026-02-09 18:15 +0800 准入

- Command:
  - `gh issue create --title "Governance closeout: archive merged active change issue-340" ...`
  - `scripts/agent_worktree_setup.sh 342 governance-archive-issue-340-closeout`
  - `rulebook task create issue-342-governance-archive-issue-340-closeout`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`#342`
  - worktree 创建成功：`.worktrees/issue-342-governance-archive-issue-340-closeout`
  - Rulebook task 创建成功

### 2026-02-09 18:16 +0800 Dependency Sync Check

- Inputs:
  - `openspec/changes/issue-340-governance-closeout-archive-338-266/*`
  - `rulebook/tasks/issue-340-governance-closeout-archive-338-266/*`
  - GitHub status: `PR #341` merged
- Checks:
  - 数据结构：仅治理文档目录移动，无业务数据结构变更
  - IPC 契约：无通道/请求响应修改
  - 错误码：无错误码字典修改
  - 阈值：无性能阈值调整
- Conclusion:
  - `无漂移`，可进入 Red/Green 收口

### 2026-02-09 18:16 +0800 Red 证据

- Command:
  - `test -d openspec/changes/issue-340-governance-closeout-archive-338-266 && echo CHANGE_340_ACTIVE`
  - `test -d rulebook/tasks/issue-340-governance-closeout-archive-338-266 && echo TASK_340_ACTIVE`
- Exit code: `0`
- Key output:
  - active 目录命中：`CHANGE_340_ACTIVE`、`TASK_340_ACTIVE`

### 2026-02-09 18:43 +0800 Green 归档执行

- Command:
  - `git mv openspec/changes/issue-340-governance-closeout-archive-338-266 openspec/changes/archive/issue-340-governance-closeout-archive-338-266`
  - `git mv rulebook/tasks/issue-340-governance-closeout-archive-338-266 rulebook/tasks/archive/2026-02-09-issue-340-governance-closeout-archive-338-266`
  - `test -d openspec/changes/archive/issue-340-governance-closeout-archive-338-266 && echo CHANGE_340_ARCHIVE_PRESENT=yes`
  - `test -d openspec/changes/issue-340-governance-closeout-archive-338-266 || echo CHANGE_340_ACTIVE_PRESENT=no`
  - `test -d rulebook/tasks/archive/2026-02-09-issue-340-governance-closeout-archive-338-266 && echo TASK_340_ARCHIVE_PRESENT=yes`
  - `test -d rulebook/tasks/issue-340-governance-closeout-archive-338-266 || echo TASK_340_ACTIVE_PRESENT=no`
- Exit code: `0`
- Key output:
  - `CHANGE_340_ARCHIVE_PRESENT=yes`
  - `CHANGE_340_ACTIVE_PRESENT=no`
  - `TASK_340_ARCHIVE_PRESENT=yes`
  - `TASK_340_ACTIVE_PRESENT=no`

### 2026-02-09 18:43 +0800 Execution Order 同步

- Command:
  - `edit openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - 活跃 change 集合更新为仅保留：`issue-342-governance-archive-issue-340-closeout`
  - 文档不再声明 `issue-340-governance-closeout-archive-338-266` 为进行中
