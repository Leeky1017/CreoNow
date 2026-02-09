# ISSUE-336

- Issue: #336
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/336
- Branch: task/336-rulebook-archive-issue-334
- PR: TBD
- Scope: 归档 issue-334 Rulebook task，并完成治理收口证据
- Out of Scope: 运行时代码、IPC 契约与跨模块行为变更

## Plan

- [x] 准入：OPEN issue + task branch + worktree
- [x] OpenSpec / Rulebook admission
- [x] 依赖同步检查（Dependency Sync Check）
- [x] Red 证据记录
- [x] Green 实施（Rulebook 归档）
- [ ] PR + required checks + merge + main 收口

## Runs

### 2026-02-09 14:46 准入

- Command:
  - `gh issue create --title "Archive rulebook task for issue-334 and finalize closeout" ...`
  - `git worktree add .worktrees/issue-336-rulebook-archive-issue-334 -b task/336-rulebook-archive-issue-334 origin/main`
  - `rulebook task create issue-336-rulebook-archive-issue-334`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`#336`
  - worktree 创建成功并跟踪 `origin/main`
  - Rulebook task 创建成功

### 2026-02-09 14:48 依赖同步检查（Dependency Sync Check）

- Inputs:
  - `openspec/changes/issue-334-archive-closeout-and-worktree-cleanup/*`
  - `rulebook/tasks/issue-334-archive-closeout-and-worktree-cleanup/*`
  - PR `#335` merge 状态
- Checks:
  - 数据结构：仅 OpenSpec/Rulebook 治理文档变更，无运行时数据结构变更
  - IPC 契约：无新增/删除通道，无请求响应结构改动
  - 错误码：无新增/删除错误码
  - 阈值：无性能/超时阈值调整
- Conclusion:
  - `无漂移`，可进入 Red/Green 收口流程

### 2026-02-09 14:49 Red 证据

- Command:
  - `test -d rulebook/tasks/issue-334-archive-closeout-and-worktree-cleanup && echo ACTIVE_PRESENT`
  - `ls rulebook/tasks/archive | rg 'issue-334-archive-closeout-and-worktree-cleanup'`
  - `rg -n "issue-336-rulebook-archive-issue-334" openspec/changes/EXECUTION_ORDER.md`
- Exit code: `1`（期望出现失败，用于 Red 证据）
- Key output:
  - `ACTIVE_PRESENT`
  - archive 目录未命中 `issue-334` 条目
  - `EXECUTION_ORDER.md` 未包含 `issue-336`

### 2026-02-09 14:50 Green 实施

- Command:
  - `rulebook task archive issue-334-archive-closeout-and-worktree-cleanup`
  - `edit openspec/changes/EXECUTION_ORDER.md`
  - `edit openspec/changes/issue-336-rulebook-archive-issue-334/*`
  - `edit rulebook/tasks/issue-336-rulebook-archive-issue-334/*`
- Exit code: `0`
- Key output:
  - `✅ Task issue-334-archive-closeout-and-worktree-cleanup archived successfully`
