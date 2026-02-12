# ISSUE-441

- Issue: #441
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/441
- Branch: task/441-p5-workbench-rightpanel-statusbar
- PR: https://github.com/Leeky1017/CreoNow/pull/445
- Scope: 完成 `openspec/changes/workbench-p5-03-rightpanel-statusbar` 全部规划任务并按治理流程合并回控制面 `main`
- Out of Scope: `workbench-p5-01` / `workbench-p5-02` / `workbench-p5-04` / `workbench-p5-05` 与任何无关改动

## Plan

- [x] 任务准入：OPEN issue + Rulebook task + task worktree
- [x] Specification + Dependency Sync Check
- [x] Red：先写失败测试并记录失败证据
- [x] Green：最小实现通过
- [x] Refactor：提取 SaveIndicator + Storybook 场景补齐
- [ ] preflight + PR + auto-merge + main 收口 + Rulebook 归档 + worktree 清理

## Runs

### 2026-02-12 16:13 +0800 准入（Issue 创建与修复）

- Command:
  - `gh issue create --title "Deliver workbench-p5-03-rightpanel-statusbar and merge to main" --body "..."`
  - `gh issue edit 441 --body-file /tmp/issue-441-body.md`
  - `gh issue view 441 --json number,state,title,body,url`
- Exit code: `0`
- Key output:
  - 首次创建返回 `https://github.com/Leeky1017/CreoNow/issues/441`
  - 因 shell 误解释反引号导致 body 污染，已在同轮修复为正确 scope
  - 最终确认 issue `#441` 为 `OPEN`

### 2026-02-12 16:14 +0800 Rulebook task 初始化

- Command:
  - `rulebook task create issue-441-p5-workbench-rightpanel-statusbar`
  - `rulebook task validate issue-441-p5-workbench-rightpanel-statusbar`
- Exit code: `0`
- Key output:
  - `Task issue-441-p5-workbench-rightpanel-statusbar created successfully`
  - `Task issue-441-p5-workbench-rightpanel-statusbar is valid`

### 2026-02-12 16:15 +0800 环境隔离（worktree）

- Command:
  - `scripts/agent_worktree_setup.sh 441 p5-workbench-rightpanel-statusbar`
  - `git fetch origin main && git checkout main && git pull --ff-only origin main && git worktree add -b task/441-p5-workbench-rightpanel-statusbar .worktrees/issue-441-p5-workbench-rightpanel-statusbar origin/main`
- Exit code:
  - `agent_worktree_setup.sh`: `1`
  - 手工流程: `0`
- Key output:
  - `agent_worktree_setup.sh` 因控制面存在并行 agent 未追踪目录阻断
  - 已按最新 `origin/main` 手工创建隔离 worktree 并进入 `task/441-p5-workbench-rightpanel-statusbar`

### 2026-02-12 16:16 +0800 Specification 审阅与 Dependency Sync Check

- Command:
  - `sed -n '1,320p' openspec/specs/workbench/spec.md`
  - `sed -n '1,320p' openspec/changes/workbench-p5-03-rightpanel-statusbar/specs/workbench-delta.md`
  - `sed -n '1,320p' openspec/changes/workbench-p5-03-rightpanel-statusbar/tasks.md`
  - `sed -n '1,260p' openspec/changes/archive/workbench-p5-00-contract-sync/specs/workbench-delta.md`
  - `nl -ba apps/desktop/renderer/src/components/layout/RightPanel.tsx`
  - `nl -ba apps/desktop/renderer/src/features/ai/AiPanel.tsx`
  - `nl -ba apps/desktop/renderer/src/components/layout/StatusBar.tsx`
  - `nl -ba apps/desktop/renderer/src/components/layout/AppShell.tsx`
  - `nl -ba apps/desktop/renderer/src/stores/layoutStore.tsx`
- Exit code: `0`
- Dependency Sync Check 结论:
  - 上游 `archive/workbench-p5-00-contract-sync` 约束 RightPanel 外层 tab 为 `ai | info | quality`
  - 当前 change 与该依赖假设一致，无数据结构 / IPC / 错误码 / 阈值漂移
  - 可进入 Red 阶段

### 2026-02-12 16:21 +0800 Red（先失败）

- Command:
  - `pnpm -C apps/desktop test:run src/features/ai/AiPanel.test.tsx src/components/layout/RightPanel.test.tsx src/components/layout/AppShell.test.tsx src/components/layout/StatusBar.test.tsx src/stores/layoutStore.test.ts`
- Exit code: `1`
- Key output（首次）:
  - `vitest: not found`
  - `node_modules missing`
- Action:
  - 依规范执行依赖安装后重跑。

### 2026-02-12 16:22 +0800 依赖安装（冻结锁）

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `Lockfile is up to date`
  - `Done in 2.1s`

### 2026-02-12 16:24 +0800 Red 失败证据（测试失败）

- Command:
  - `pnpm -C apps/desktop test:run src/features/ai/AiPanel.test.tsx src/components/layout/RightPanel.test.tsx src/components/layout/AppShell.test.tsx src/components/layout/StatusBar.test.tsx src/stores/layoutStore.test.ts`
- Exit code: `1`
- Key failed assertions:
  - `layoutStore.test.ts`: 未持久化 `creonow.layout.activeRightPanel`；启动未恢复 `info`
  - `AppShell.test.tsx`: `Ctrl+L` 从折叠打开后 `AI` tab 未激活
  - `RightPanel.test.tsx` / `AiPanel.test.tsx`: 仍存在内部 `Assistant/Info` 子标签
  - `StatusBar.test.tsx`: 缺少项目名/文档名/字数/时间与完整保存状态机节点

### 2026-02-12 16:24 +0800 Green 实现

- Files:
  - `apps/desktop/renderer/src/features/ai/AiPanel.tsx`
  - `apps/desktop/renderer/src/components/layout/AppShell.tsx`
  - `apps/desktop/renderer/src/stores/layoutStore.tsx`
  - `apps/desktop/renderer/src/lib/preferences.ts`
  - `apps/desktop/renderer/src/components/layout/StatusBar.tsx`
  - `apps/desktop/renderer/src/components/layout/SaveIndicator.tsx`
- 实施点:
  - 删除 AiPanel 内部 `activeTab` / sub-tab header / 占位 InfoPanel
  - `Cmd/Ctrl+L` 从折叠展开时强制 `setActiveRightPanel("ai")`
  - `activeRightPanel` 持久化与恢复（非法值回退 `ai`）
  - StatusBar 补齐项目名、文档名、字数、保存状态机、当前时间与错误重试

### 2026-02-12 16:24 +0800 Green 验证（目标测试）

- Command:
  - `pnpm -C apps/desktop test:run src/features/ai/AiPanel.test.tsx src/components/layout/RightPanel.test.tsx src/components/layout/AppShell.test.tsx src/components/layout/StatusBar.test.tsx src/stores/layoutStore.test.ts`
- Exit code: `0`
- Key output:
  - `Test Files 5 passed`
  - `Tests 56 passed`

### 2026-02-12 16:26 +0800 Refactor + 回归验证

- Files:
  - `apps/desktop/renderer/src/components/layout/RightPanel.stories.tsx`
  - `apps/desktop/renderer/src/components/layout/StatusBar.stories.tsx`
- Command:
  - `pnpm -C apps/desktop test:run src/components/layout/Layout.test.tsx src/components/layout/AppShell.test.tsx src/components/layout/RightPanel.test.tsx src/components/layout/StatusBar.test.tsx src/features/ai/AiPanel.test.tsx src/stores/layoutStore.test.ts`
- Exit code: `0`
- Key output:
  - `Test Files 6 passed`
  - `Tests 70 passed`

### 2026-02-12 16:29 +0800 格式化校验

- Command:
  - `pnpm exec prettier --check <changed files>`
  - `pnpm exec prettier --write apps/desktop/renderer/src/components/layout/RightPanel.test.tsx apps/desktop/renderer/src/components/layout/StatusBar.stories.tsx apps/desktop/renderer/src/components/layout/StatusBar.test.tsx apps/desktop/renderer/src/components/layout/StatusBar.tsx apps/desktop/renderer/src/features/ai/AiPanel.tsx`
  - `pnpm exec prettier --check <changed files>`
- Exit code:
  - 首次 check: `1`
  - write: `0`
  - 二次 check: `0`
- Key output:
  - 首次命中 5 个文件格式不一致
  - 二次校验 `All matched files use Prettier code style!`

### 2026-02-12 16:30 +0800 最终测试复验

- Command:
  - `pnpm -C apps/desktop test:run src/features/ai/AiPanel.test.tsx src/components/layout/RightPanel.test.tsx src/components/layout/AppShell.test.tsx src/components/layout/StatusBar.test.tsx src/stores/layoutStore.test.ts src/components/layout/Layout.test.tsx`
- Exit code: `0`
- Key output:
  - `Test Files 6 passed`
  - `Tests 70 passed`

### 2026-02-12 16:31 +0800 类型检查

- Command:
  - `pnpm -C apps/desktop typecheck`
- Exit code: `0`
- Key output:
  - `tsc -p tsconfig.json --noEmit` 通过

### 2026-02-12 16:31 +0800 Rulebook validate（实现后复验）

- Command:
  - `rulebook task validate issue-441-p5-workbench-rightpanel-statusbar`
- Exit code: `0`
- Key output:
  - `Task issue-441-p5-workbench-rightpanel-statusbar is valid`
  - warning: `No spec files found (specs/*/spec.md)`

### 2026-02-12 16:32 +0800 首次自动收口阻断

- Command:
  - `scripts/agent_pr_automerge_and_sync.sh`
- Exit code: `1`
- Key output:
  - preflight 首次阻断：`RUN_LOG PR field still placeholder`
  - 因分支未先推送，`gh pr create` 失败（`Head sha can't be blank` / `No commits between main and task/...`）

### 2026-02-12 16:32 +0800 分支推送 + 自动收口重试

- Command:
  - `git push -u origin task/441-p5-workbench-rightpanel-statusbar`
  - `scripts/agent_pr_automerge_and_sync.sh`
- Exit code:
  - push: `0`
  - script: `blocked`
- Key output:
  - 脚本自动回填 RUN_LOG PR 链接并提交：`docs: backfill run log PR link (#441)`
  - preflight 二次阻断：`change tasks.md checkboxes are all checked, so the change is completed and must be archived`

### 2026-02-12 16:33 +0800 完成 change 归档与执行顺序同步

- Command:
  - `git mv openspec/changes/workbench-p5-03-rightpanel-statusbar openspec/changes/archive/workbench-p5-03-rightpanel-statusbar`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - `workbench-p5-03-rightpanel-statusbar` 已归档到 `openspec/changes/archive/`
  - `EXECUTION_ORDER.md` 已同步为活跃 change 数量 `4`
