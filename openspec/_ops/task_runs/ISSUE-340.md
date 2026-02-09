# ISSUE-340

- Issue: #340
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/340
- Branch: task/340-governance-closeout-archive-338-266
- PR: (待回填)
- Scope: 归档已合并 active changes（338/266）及对应 Rulebook active tasks（仅治理文档）
- Out of Scope: 运行时代码改动；功能行为变更

## Plan

- [x] 准入：创建 OPEN issue + task branch + worktree
- [x] OpenSpec/Rulebook admission 文档建立
- [x] Dependency Sync Check（`#339`、`#279` 已合并事实核对）
- [x] Red 证据记录
- [x] Green 归档与执行顺序更新
- [ ] PR + required checks + merge + main 收口

## Runs

### 2026-02-09 16:22 +0800 准入

- Command:
  - `gh issue create --title "Governance closeout: archive merged active changes 338/266" ...`
  - `scripts/agent_worktree_setup.sh 340 governance-closeout-archive-338-266`
  - `rulebook task create issue-340-governance-closeout-archive-338-266`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`#340`
  - worktree 创建成功：`.worktrees/issue-340-governance-closeout-archive-338-266`
  - Rulebook task 创建成功

### 2026-02-09 16:24 +0800 Dependency Sync Check

- Inputs:
  - `openspec/changes/issue-338-governance-closeout-active-legacy/*`
  - `openspec/changes/db-native-binding-doctor/*`
  - `rulebook/tasks/issue-338-governance-closeout-active-legacy/*`
  - `rulebook/tasks/issue-266-db-native-binding-doctor/*`
  - GitHub status: `PR #339` merged, `PR #279` merged
- Checks:
  - 数据结构：仅治理文档目录移动，无业务数据结构变更
  - IPC 契约：无通道/请求响应修改
  - 错误码：无错误码字典修改
  - 阈值：无性能阈值调整
- Conclusion:
  - `无漂移`，可进入 Red/Green 收口

### 2026-02-09 16:26 +0800 Red 证据

- Command:
  - `test -d openspec/changes/issue-338-governance-closeout-active-legacy && echo CHANGE_338_ACTIVE`
  - `test -d openspec/changes/db-native-binding-doctor && echo CHANGE_266_ACTIVE`
  - `test -d rulebook/tasks/issue-338-governance-closeout-active-legacy && echo TASK_338_ACTIVE`
  - `test -d rulebook/tasks/issue-266-db-native-binding-doctor && echo TASK_266_ACTIVE`
  - `rg -n "issue-338-governance-closeout-active-legacy|db-native-binding-doctor" openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - active 目录命中：`CHANGE_338_ACTIVE`、`CHANGE_266_ACTIVE`、`TASK_338_ACTIVE`、`TASK_266_ACTIVE`
  - `EXECUTION_ORDER.md` 命中 `issue-338` 与 `db-native-binding-doctor` 活跃声明

### 2026-02-09 16:27 +0800 Green 实施

- Command:
  - `rulebook task archive issue-338-governance-closeout-active-legacy`
  - `rulebook task archive issue-266-db-native-binding-doctor`
  - `git mv openspec/changes/issue-338-governance-closeout-active-legacy openspec/changes/archive/issue-338-governance-closeout-active-legacy`
  - `git mv openspec/changes/db-native-binding-doctor openspec/changes/archive/db-native-binding-doctor`
  - `edit openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - `✅ Task issue-338-governance-closeout-active-legacy archived successfully`
  - `✅ Task issue-266-db-native-binding-doctor archived successfully`
  - 两个 OpenSpec active change 已移动到 `openspec/changes/archive/`
  - `EXECUTION_ORDER.md` 已同步为仅 `issue-340` 活跃

### 2026-02-09 16:28 +0800 验证（Red-1）

- Command:
  - `rulebook task validate issue-340-governance-closeout-archive-338-266`
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `rulebook task validate` 通过（warnings only）
  - preflight 失败：`[RUN_LOG] PR field still placeholder ... (待回填)`
