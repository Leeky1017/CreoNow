# ISSUE-435

- Issue: #435
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/435
- Branch: task/435-workbench-p5-00-contract-sync
- PR: https://github.com/Leeky1017/CreoNow/pull/436
- Scope: 完成 `openspec/changes/workbench-p5-00-contract-sync` 全部规划任务并按治理流程合并回控制面 `main`
- Out of Scope: Workbench P5-01~05 功能实现、任何与 change 00 无关的功能改动

## Plan

- [x] 准入：创建 OPEN issue 与隔离 worktree
- [x] Rulebook task 初始化与完整化
- [x] 规格差异核验（IconBar / RightPanel / IPC 通道）
- [x] Spec-only 回归验证（现有漂移守卫测试）
- [x] change 00 任务勾选 + 归档 + EXECUTION_ORDER 同步
- [ ] preflight + PR + auto-merge + main 收口 + Rulebook 归档 + worktree 清理

## Runs

### 2026-02-12 15:40 +0800 准入（Issue）

- Command:
  - `gh issue create --title "Deliver workbench-p5-00-contract-sync and merge to main" --body-file - <<'EOF' ... EOF`
- Exit code: `0`
- Key output:
  - `https://github.com/Leeky1017/CreoNow/issues/435`

### 2026-02-12 15:40 +0800 环境隔离（worktree）

- Command:
  - `scripts/agent_worktree_setup.sh 435 workbench-p5-00-contract-sync`
- Exit code: `0`
- Key output:
  - `Worktree created: .worktrees/issue-435-workbench-p5-00-contract-sync`
  - `Branch: task/435-workbench-p5-00-contract-sync`
  - `HEAD is now at 193a00fd ... (#434)`

### 2026-02-12 15:40 +0800 Rulebook task 初始化

- Command:
  - `rulebook task create issue-435-workbench-p5-00-contract-sync`
  - `rulebook task validate issue-435-workbench-p5-00-contract-sync`
- Exit code: `0`
- Key output:
  - `Task issue-435-workbench-p5-00-contract-sync created successfully`
  - `Task issue-435-workbench-p5-00-contract-sync is valid`（warning: `No spec files found`）

### 2026-02-12 15:41 +0800 规格差异核验（Specification）

- Command:
  - `nl -ba openspec/specs/workbench/spec.md | sed -n '70,120p'`
  - `nl -ba apps/desktop/renderer/src/components/layout/IconBar.tsx | sed -n '40,120p'`
  - `nl -ba openspec/specs/workbench/spec.md | sed -n '155,205p'`
  - `nl -ba apps/desktop/renderer/src/stores/layoutStore.tsx | sed -n '24,50p'`
  - `nl -ba apps/desktop/renderer/src/components/layout/RightPanel.tsx | sed -n '45,100p'`
  - `nl -ba openspec/specs/workbench/spec.md | sed -n '226,270p'`
  - `rg -n "project:project:list|project:project:switch" ...`
  - `rg -n "project:list:recent" ...`
- Exit code: `0`
- Key output:
  - 主 spec 与代码存在已知漂移：IconBar 列表、RightPanel tab 数量、IPC 通道前缀
  - `project:list:recent` 在实际契约与调用侧均不存在

### 2026-02-12 15:41 +0800 回归验证准备（Red-like 环境阻塞）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/cross-module-drift-zero.spec.ts`
- Exit code: `1`
- Key output:
  - `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`
  - `Command "tsx" not found`
- Action:
  - 按规范执行依赖安装后重试。

### 2026-02-12 15:41 +0800 环境修复 + 回归验证（Green）

- Command:
  - `pnpm install --frozen-lockfile`
  - `pnpm exec tsx apps/desktop/tests/unit/cross-module-drift-zero.spec.ts`
- Exit code: `0`
- Key output:
  - `Lockfile is up to date`
  - `Done in 2.3s`
  - 漂移守卫测试通过（空输出退出 0）

### 2026-02-12 15:43 +0800 Rulebook task 完整化 + validate

- Command:
  - `apply_patch rulebook/tasks/issue-435-workbench-p5-00-contract-sync/proposal.md`
  - `apply_patch rulebook/tasks/issue-435-workbench-p5-00-contract-sync/tasks.md`
  - `apply_patch rulebook/tasks/issue-435-workbench-p5-00-contract-sync/.metadata.json`
  - `apply_patch rulebook/tasks/issue-435-workbench-p5-00-contract-sync/specs/workbench/spec.md`
  - `rulebook task validate issue-435-workbench-p5-00-contract-sync`
- Exit code: `0`
- Key output:
  - `Task issue-435-workbench-p5-00-contract-sync is valid`
  - warning `No spec files found` 已消除

### 2026-02-12 15:44 +0800 change 00 任务勾选与结论落盘

- Command:
  - `apply_patch openspec/changes/workbench-p5-00-contract-sync/tasks.md`
  - `apply_patch openspec/changes/workbench-p5-00-contract-sync/proposal.md`
- Exit code: `0`
- Key output:
  - `tasks.md` 全部勾选完成
  - Dependency Sync Check 结论记录：`N/A（无上游依赖）`
  - TDD Mapping 增补 Scenario -> Test 映射与 Red 门禁说明

### 2026-02-12 15:45 +0800 change 00 归档 + 执行顺序同步

- Command:
  - `git mv openspec/changes/workbench-p5-00-contract-sync openspec/changes/archive/workbench-p5-00-contract-sync`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - `workbench-p5-00-contract-sync` 已从 active 迁移至 archive
  - `EXECUTION_ORDER.md` 已更新为 active=5，Phase A 基线改为归档引用

### 2026-02-12 15:46 +0800 格式与文档门禁预检查

- Command:
  - `pnpm exec prettier --check <changed files>`
  - `pnpm exec prettier --write <changed files>`
  - `pnpm exec prettier --check <changed files>`
- Exit code:
  - 首次 check: `1`
  - write: `0`
  - 二次 check: `0`
- Key output:
  - 首次失败文件：`openspec/changes/archive/workbench-p5-00-contract-sync/proposal.md`、`rulebook/tasks/issue-435-workbench-p5-00-contract-sync/tasks.md`
  - 格式化后：`All matched files use Prettier code style!`

### 2026-02-12 15:47 +0800 PR 自动收口（首次执行，预检阻断）

- Command:
  - `scripts/agent_pr_automerge_and_sync.sh`
- Exit code: `in-progress`（脚本进入等待）
- Key output:
  - 首次 preflight 阻断：`[RUN_LOG] PR field still placeholder`
  - 脚本自动回填 PR 链接并提交：`docs: backfill run log PR link (#435)`
  - 回填后再次 preflight 阻断：`workbench-delta.md` Prettier 未通过

### 2026-02-12 15:48 +0800 preflight 修复（delta spec 格式）

- Command:
  - `pnpm exec prettier --write openspec/changes/archive/workbench-p5-00-contract-sync/specs/workbench-delta.md`
  - `git commit -m "docs: format workbench p5-00 delta spec (#435)"`
  - `git push`
- Exit code: `0`
- Key output:
  - 仅格式化变更，无行为改动
  - 分支更新：`1dee5d2b -> b30b1211`

### 2026-02-12 15:53 +0800 PR #436 合并与控制面同步

- Command:
  - `scripts/agent_pr_automerge_and_sync.sh`（同一会话继续）
- Exit code: `0`
- Key output:
  - PR：`https://github.com/Leeky1017/CreoNow/pull/436`
  - required checks：`ci`、`openspec-log-guard`、`merge-serial` 均为 `pass`
  - 自动合并完成：`mergedAt=2026-02-12T07:53:01Z`
  - 控制面同步：`OK: merged PR #436 and synced controlplane main`

### 2026-02-12 15:55 +0800 收口复核与 Rulebook 归档补充

- Command:
  - `gh issue view 435 --json ...`
  - `gh pr view 436 --json ...`
  - `test -d rulebook/tasks/issue-435-workbench-p5-00-contract-sync`
  - `gh issue reopen 435`
  - `rulebook task archive issue-435-workbench-p5-00-contract-sync`
- Exit code: `0`
- Key output:
  - 复核确认 Rulebook task 仍在 active，需要补归档
  - issue #435 已 reopen（用于同任务收口）
  - Rulebook task 已归档：`rulebook/tasks/archive/2026-02-12-issue-435-workbench-p5-00-contract-sync`
