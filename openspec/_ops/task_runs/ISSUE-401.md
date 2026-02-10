# ISSUE-401

- Issue: #401
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/401
- Branch: task/401-version-control-p1-ai-mark-preview
- PR: (待回填)
- Scope: 完成交付 `openspec/changes/version-control-p1-ai-mark-preview` 的全部规划任务（AI 区分显示偏好 + 主编辑区只读预览 + 返回当前版本），并按 OpenSpec/Rulebook/GitHub 门禁合并回控制面 `main`
- Out of Scope: 版本 Diff/回滚完整流程（`version-control-p2`）、分支合并冲突（`version-control-p3`）、硬化边界（`version-control-p4`）

## Plan

- [x] 准入：创建 OPEN issue + task 分支/worktree + Rulebook task
- [x] 规格基线：审阅主 spec/change 文档并完成 Dependency Sync Check
- [x] Red：先写失败测试并记录 Red 证据
- [x] Green：最小实现通过 Scenario 映射
- [x] Refactor：收敛实现并保持回归全绿
- [ ] preflight + PR auto-merge + main 收口 + cleanup

## Runs

### 2026-02-10 18:58 +0800 准入（Issue / Worktree）

- Command:
  - `gh issue create --title "Deliver version-control-p1-ai-mark-preview change and merge to main" --body-file -`
  - `gh issue view 401 --json number,state,title,url`
  - `scripts/agent_worktree_setup.sh 401 version-control-p1-ai-mark-preview`
  - `git worktree list`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/401`
  - Issue 状态：`OPEN`
  - worktree 创建成功：`.worktrees/issue-401-version-control-p1-ai-mark-preview`
  - 分支创建成功：`task/401-version-control-p1-ai-mark-preview`

### 2026-02-10 19:00 +0800 Rulebook 准入

- Command:
  - `rulebook task create issue-401-version-control-p1-ai-mark-preview`
  - `rulebook task validate issue-401-version-control-p1-ai-mark-preview`
- Exit code: `0`
- Key output:
  - Rulebook task 创建成功：`rulebook/tasks/issue-401-version-control-p1-ai-mark-preview`
  - validate 通过（当前警告：`No spec files found`，不阻断）

### 2026-02-10 19:03 +0800 Dependency Sync Check（version-control-p0 + editor-p0）

- Input:
  - `openspec/specs/version-control/spec.md`
  - `openspec/changes/version-control-p1-ai-mark-preview/{proposal.md,tasks.md,specs/version-control-delta.md}`
  - `openspec/changes/archive/version-control-p0-snapshot-history/specs/version-control-delta.md`
  - `openspec/changes/archive/editor-p0-tiptap-foundation-toolbar/specs/editor-delta.md`
  - `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx`
  - `apps/desktop/renderer/src/features/editor/EditorPane.tsx`
  - `apps/desktop/renderer/src/stores/versionStore.tsx`
- Checkpoints:
  - 数据结构：`version:snapshot:list/read` 数据结构仍满足 `documentId/versionId/contentJson/contentText/createdAt`，未发生契约漂移。
  - IPC 契约：`version:snapshot:read` 继续可用，可承载预览内容读取。
  - 编辑器只读 API：`EditorPane` 已通过 `editor.setEditable(...)` 控制可编辑状态，具备预览只读切换基础。
  - 工具栏禁用机制：`EditorToolbar` 已支持按钮级 `disabled`，可扩展为预览全禁用。
- Conclusion: `NO_DRIFT`

### 2026-02-10 19:06 +0800 Red 前环境准备（worktree 依赖）

- Command:
  - `pnpm -C apps/desktop test:run src/stores/versionStore.test.ts src/stores/versionPreferencesStore.test.ts src/features/version-history/VersionHistoryPanel.test.tsx src/features/editor/EditorPane.test.tsx`
  - `pnpm install --frozen-lockfile`
- Exit code: `1`（首次）→ `0`（安装）
- Key output:
  - 首次 Red 运行阻断：`vitest: not found`，提示 `node_modules missing`
  - 依赖安装成功：`Lockfile is up to date`、`Packages: +979`

### 2026-02-10 19:07 +0800 Red 失败验证（AI 标记 + 预览状态机 + 编辑器预览）

- Command:
  - `pnpm -C apps/desktop test:run src/stores/versionStore.test.ts src/stores/versionPreferencesStore.test.ts src/features/version-history/VersionHistoryPanel.test.tsx src/features/editor/EditorPane.test.tsx`
- Exit code: `1`
- Key output:
  - `versionPreferencesStore.test.ts`：`Failed to resolve import "./versionPreferencesStore"`
  - `versionStore.test.ts`：`startPreview is not a function`
  - `VersionHistoryPanel.test.tsx`：`Unable to find [data-testid="ai-mark-tag-v-ai-mark"]`
  - `EditorPane.test.tsx`：缺少 `editor-preview-banner` 与「返回当前版本」按钮
- Conclusion:
  - Red 成功触发，覆盖偏好持久化、AI 标签渲染、预览状态机、只读预览入口四类缺口。

### 2026-02-10 19:12 +0800 Green 目标测试回归（核心受影响用例）

- Command:
  - `pnpm -C apps/desktop test:run src/stores/versionStore.test.ts src/stores/versionPreferencesStore.test.ts src/features/version-history/VersionHistoryPanel.test.tsx src/features/editor/EditorPane.test.tsx src/features/version-history/VersionHistoryContainer.test.tsx`
  - `pnpm -C apps/desktop test:run src/features/settings-dialog/SettingsDialog.test.tsx src/components/layout/AppShell.restoreConfirm.test.tsx src/components/layout/AppShell.test.tsx src/components/layout/Sidebar.test.tsx`
- Exit code: `0` / `0`
- Key output:
  - 第一组：`5 files, 34 tests passed`
  - 第二组：`4 files, 44 tests passed`
  - 关键场景通过：AI 标签开关、预览状态机、编辑器只读预览条、返回当前版本、容器层预览触发、设置对话框与布局回归。

### 2026-02-10 19:18 +0800 Refactor：修复 typecheck 阻塞（仅测试 mock typing）

- Command:
  - `pnpm typecheck`
  - `pnpm -C apps/desktop test:run src/features/editor/EditorPane.test.tsx src/stores/versionStore.test.ts`
- Exit code: `0` / `0`
- Key output:
  - `tsc --noEmit` 通过，`IpcErrorCode` 与 `IpcInvoke` 泛型约束报错清零。
  - 回归：`2 files, 6 tests passed`（`EditorPane.test.tsx`、`versionStore.test.ts`）。

### 2026-02-10 19:19 +0800 全量门禁回归（Rulebook 5.2）

- Command:
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
- Exit code: `0` / `0` / `0` / `0`
- Key output:
  - `lint`：`eslint . --ext .ts,.tsx` 通过。
  - `contract:check`：`contract:generate` 后 `packages/shared/types/ipc-generated.ts` 无差异。
  - `cross-module:check`：`[CROSS_MODULE_GATE] PASS`。
  - `test:unit`：单元门禁链路通过（含 IPC、cross-module、memory、document、storybook inventory）。

### 2026-02-10 19:20 +0800 变更归档与执行顺序同步

- Command:
  - `mv openspec/changes/version-control-p1-ai-mark-preview openspec/changes/archive/`
  - 编辑 `openspec/changes/EXECUTION_ORDER.md`（活跃数量/顺序/依赖/更新时间同步）
- Exit code: `0`
- Key output:
  - 已完成 change 归档：`openspec/changes/archive/version-control-p1-ai-mark-preview/`
  - `EXECUTION_ORDER.md` 已同步为活跃 `11` 项，Version Control 泳道更新为 `p2 → p3 → p4`。
