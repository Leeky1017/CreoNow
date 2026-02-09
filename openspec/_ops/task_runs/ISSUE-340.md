# ISSUE-340

- Issue: #340
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/340
- Branch: task/340-governance-closeout-archive-338-266
- PR: https://github.com/Leeky1017/CreoNow/pull/341
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

### 2026-02-09 16:30 +0800 提交与 PR

- Command:
  - `git add -A && git commit -m "chore: archive merged active changes and tasks (#340)"`
  - `git push -u origin task/340-governance-closeout-archive-338-266`
  - `gh pr create --base main --head task/340-governance-closeout-archive-338-266 --title "Governance closeout: archive merged active changes 338/266 (#340)" ...`
- Exit code: `0`
- Key output:
  - Commit: `ee546dc5`
  - PR: `https://github.com/Leeky1017/CreoNow/pull/341`

### 2026-02-09 16:31 +0800 验证（Red-2）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - preflight 失败：`rulebook/tasks/issue-340-governance-closeout-archive-338-266/.metadata.json` 与 `proposal.md` Prettier 不合规

### 2026-02-09 16:32 +0800 格式修复

- Command:
  - `pnpm exec prettier --write rulebook/tasks/issue-340-governance-closeout-archive-338-266/.metadata.json rulebook/tasks/issue-340-governance-closeout-archive-338-266/proposal.md`
- Exit code: `0`
- Key output:
  - 2 个 Rulebook 文件已按 Prettier 规范格式化

### 2026-02-09 16:33 +0800 验证（Red-3）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - preflight 失败：`pnpm typecheck` 报错 `tsc: not found`

### 2026-02-09 16:34 +0800 依赖安装与验证（Green）

- Command:
  - `pnpm install --frozen-lockfile`
  - `scripts/agent_pr_preflight.sh`
- Exit code: `0`（最终 preflight）
- Key output:
  - 依赖安装完成：`Lockfile is up to date`，`Packages: +978`
  - preflight 最终通过：`prettier`、`typecheck`、`lint`（0 error/3 warning）、`contract:check`、`cross-module:check`、`test:unit` 全部通过
