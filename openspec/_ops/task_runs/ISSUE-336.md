# ISSUE-336

- Issue: #336
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/336
- Branch: task/336-rulebook-archive-issue-334
- PR: https://github.com/Leeky1017/CreoNow/pull/337
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
- Exit code: `0` + `1`（第二条命令期望失败，用于 Red 证据）
- Key output:
  - `ACTIVE_PRESENT`
  - archive 目录未命中 `issue-334` 条目

### 2026-02-09 14:50 Green 实施

- Command:
  - `rulebook task archive issue-334-archive-closeout-and-worktree-cleanup`
  - `edit openspec/changes/EXECUTION_ORDER.md`
  - `edit openspec/changes/issue-336-rulebook-archive-issue-334/*`
  - `edit rulebook/tasks/issue-336-rulebook-archive-issue-334/*`
- Exit code: `0`
- Key output:
  - `✅ Task issue-334-archive-closeout-and-worktree-cleanup archived successfully`
  - `ACTIVE_REMOVED`
  - `2026-02-09-issue-334-archive-closeout-and-worktree-cleanup`

### 2026-02-09 14:55 规则校验与提交

- Command:
  - `rulebook task validate issue-336-rulebook-archive-issue-334`
  - `git add -A && git commit -m "chore: archive issue-334 rulebook task closeout (#336)"`
  - `git push -u origin task/336-rulebook-archive-issue-334`
  - `gh pr create --base main --head task/336-rulebook-archive-issue-334 ...`
- Exit code: `0`
- Key output:
  - `✅ Task issue-336-rulebook-archive-issue-334 is valid`
  - Commit: `f75bfa8d`
  - PR: `https://github.com/Leeky1017/CreoNow/pull/337`

### 2026-02-09 15:00 preflight 修复与复验

- Command:
  - `scripts/agent_pr_preflight.sh`
  - `pnpm exec prettier --write rulebook/tasks/archive/2026-02-09-issue-334-archive-closeout-and-worktree-cleanup/{.metadata.json,proposal.md,tasks.md} rulebook/tasks/issue-336-rulebook-archive-issue-334/{.metadata.json,proposal.md}`
  - `pnpm install --frozen-lockfile`
  - `scripts/agent_pr_preflight.sh`
- Exit code: `0`（最终复验）
- Key output:
  - 首次 preflight 失败：`tasks.md` 缺少固定 Red-gate 文案；已按要求修复
  - 二次 preflight 失败：Rulebook 文档 Prettier 不合规；已格式化
  - 三次 preflight 失败：`tsc: not found`；安装依赖后恢复
  - 最终 preflight 通过：`typecheck`、`contract:check`、`cross-module:check`、`test:unit` 全部通过（lint 仅历史 warning）
