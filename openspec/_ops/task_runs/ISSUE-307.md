# ISSUE-307

- Issue: #307
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/307
- Branch: task/307-project-management-p1-lifecycle-switch-delete
- PR: PENDING
- Scope: 完成 `openspec/changes/project-management-p1-lifecycle-switch-delete` 的全部任务内容（仅该 change）
- Out of Scope: 该 change 之外的功能与文档变更

## Plan

- 完成 Rulebook task 创建与 validate，并在独立 worktree 开展实现。
- 先完成 Dependency Sync Check，再按 PM2-S1~S10 执行 Red→Green→Refactor。
- 完成 IPC/服务/前端与测试落地，记录性能基线与异常路径证据。
- 通过 preflight 与 required checks，开启 auto-merge，收口 main 并归档 change。

## Runs

### 2026-02-08 22:41 准入阻断（关闭 Issue 不可复用）

- Command: `gh issue view 291 --json number,state,title,url`
- Exit code: `0`
- Key output:
  - `{"number":291,"state":"CLOSED","title":"Project Management: draft PM-1 and PM-2 OpenSpec changes","url":"https://github.com/Leeky1017/CreoNow/issues/291"}`
- Decision:
  - 按 AGENTS 规则停止复用历史入口，改为创建新的 OPEN Issue。

### 2026-02-08 22:42 新建 OPEN Issue 入口

- Command: `gh issue list --state open --limit 200 --json number,title,url --search "project-management-p1-lifecycle-switch-delete"`
- Exit code: `0`
- Key output:
  - `[]`（无现成 OPEN Issue）
- Command: `gh issue create --title "Deliver change project-management-p1-lifecycle-switch-delete" --body "..."`
- Exit code: `0`
- Key output:
  - `https://github.com/Leeky1017/CreoNow/issues/307`

### 2026-02-08 22:43 控制面同步与 worktree 创建

- Command: `git fetch origin && git checkout main && git pull --ff-only origin main`
- Exit code: `0`
- Key output:
  - `Already up to date.`
- Command: `git worktree add .worktrees/issue-307-project-management-p1-lifecycle-switch-delete -b task/307-project-management-p1-lifecycle-switch-delete`
- Exit code: `0`
- Key output:
  - `Preparing worktree (new branch 'task/307-project-management-p1-lifecycle-switch-delete')`

### 2026-02-08 22:45 Rulebook 任务初始化

- Command: `rulebook task create issue-307-project-management-p1-lifecycle-switch-delete`（MCP）
- Exit code: `0`
- Key output:
  - `Task issue-307-project-management-p1-lifecycle-switch-delete created successfully`
- Note:
  - MCP 默认写入控制面路径，随后已复制到本 worktree 并清理控制面残留目录。

### 2026-02-08 22:47 Rulebook 校验（worktree 内）

- Command: `rulebook task validate issue-307-project-management-p1-lifecycle-switch-delete`
- Exit code: `0`
- Key output:
  - `✅ Task issue-307-project-management-p1-lifecycle-switch-delete is valid`

### 2026-02-08 22:49 Dependency Sync Check（PM-1 -> PM-2）

- Input checks:
  - 数据模型：`openspec/changes/archive/project-management-p0-creation-metadata-dashboard` 已归档，`projects` 模型已包含 `archived_at`（支持 PM-2 生命周期落地）
  - IPC 契约：当前已落地 PM-1 通道为 `project:project:*`（create/list/update/stats/archive/getcurrent/setcurrent/delete）
  - 命名治理：IPC 命名规则要求三段式 `<domain>:<resource>:<action>`
  - 错误码：`PROJECT_DELETE_REQUIRES_ARCHIVE` / `PROJECT_PURGE_PERMISSION_DENIED` / `PROJECT_LIFECYCLE_WRITE_FAILED` 尚未定义（待 PM-2 实现）
- Drift:
  - PM-2 delta 原文使用了两段式/旧式通道名（如 `project:switch`、`project:archive`），与当前治理基线不一致。
- Action:
  - 已先更新 PM-2 文档：
    - `project:switch` -> `project:project:switch`
    - `project:archive|restore|purge` -> `project:lifecycle:archive|restore|purge`
    - Red 证据日志目标由 `ISSUE-291` 修正为 `ISSUE-307`
- Conclusion:
  - 依赖已满足且文档漂移已修正，可进入 Red 阶段。

### 2026-02-08 23:02 Red 失败证据（PM2 测试初次执行）

- Command: `pnpm exec tsx apps/desktop/tests/integration/project-purge.concurrent.test.ts`
- Exit code: `1`
- Key output:
  - `TypeError: Cannot read properties of undefined (reading 'ok')`
  - `at Object.lifecyclePurge (.../projectService.ts:1236:21)`
- Diagnosis:
  - `projectService.ts` 中 `ipcError` / `createDefaultProjectMetadata` 出现错误 patch，返回值结构被破坏。

- Command: `pnpm -C apps/desktop exec vitest run renderer/src/features/projects/ProjectSwitcher.loading-bar.test.tsx renderer/src/features/projects/DeleteProjectDialog.confirmation.test.tsx`
- Exit code: `1`
- Key output:
  - `ProjectSwitcher.loading-bar.test.tsx ... Test timed out in 5000ms`
- Diagnosis:
  - 组件测试在 fake timers + async handler 场景下触发等待超时，需要最小化调整事件触发与 act 驱动。

### 2026-02-08 23:10 Green 修复（服务与 IPC 关键路径）

- Edited:
  - `apps/desktop/main/src/services/projects/projectService.ts`
  - `apps/desktop/main/src/services/projects/projectLifecycleStateMachine.ts`
  - `apps/desktop/main/src/ipc/project.ts`
  - `apps/desktop/main/src/ipc/runtime-validation.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
- Key fixes:
  - 修复 `createDefaultProjectMetadata` 返回 `ServiceResult<ProjectMetadata>`。
  - 修复 `ipcError` 默认分支返回 `Err`，消除 `undefined` 错误路径。
  - `createProjectService` 恢复 `const service = {...}; return service;`，支持内部复用 `service.lifecycle*`。
  - 落地 PM2 契约：`project:project:switch` 与 `project:lifecycle:{archive|restore|purge|get}`，并补齐错误码。

### 2026-02-08 23:16 Green 修复（Renderer/Store/UI）

- Edited:
  - `apps/desktop/renderer/src/stores/projectStore.tsx`
  - `apps/desktop/renderer/src/stores/editorStore.tsx`
  - `apps/desktop/renderer/src/App.tsx`
  - `apps/desktop/renderer/src/features/projects/ProjectSwitcher.tsx`
  - `apps/desktop/renderer/src/features/projects/DeleteProjectDialog.tsx`
  - `apps/desktop/renderer/src/features/dashboard/DashboardPage.tsx`
- Key behavior:
  - 切换项目前 flush autosave，再调用 `project:project:switch`。
  - 删除确认改为名称精确匹配。
  - 生命周期入口统一走 `project:lifecycle:*`。
  - 切换耗时 >1s 显示顶部进度条。

### 2026-02-08 23:18 Storybook/Type 对齐修复

- Command: `pnpm typecheck`
- Exit code: `1`（首次）
- Key output:
  - `CreateProjectDialog.stories.tsx` / `WelcomeScreen.stories.tsx` 返回旧字段 `archived`，缺少 `state`。
- Action:
  - 更新上述 stories mock 返回为 `{ projectId, state, archivedAt? }`。
- Command: `pnpm typecheck`
- Exit code: `0`（修复后）

### 2026-02-08 23:20 Lint 修复（新增 trace fallback）

- Command: `pnpm lint`
- Exit code: `1`（首次）
- Key output:
  - `App.tsx` purity 规则报错：`Date.now` / ref / globals fallback。
- Action:
  - 将 `createTraceId` fallback 调整为纯常量 `"trace-fallback"`（主路径仍优先 `crypto.randomUUID()`）。
- Command: `pnpm lint`
- Exit code: `0`
- Notes:
  - 存在 4 条仓库既有 warnings（`react-hooks/exhaustive-deps`），无 error。

### 2026-02-08 23:26 PM2 场景 Green 通过证据（S1-S10）

- Command set (all exit `0`):
  - `pnpm exec tsx apps/desktop/tests/integration/project-switch.autosave.test.ts`
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/projects/ProjectSwitcher.loading-bar.test.tsx renderer/src/features/projects/DeleteProjectDialog.confirmation.test.tsx`
  - `pnpm exec tsx apps/desktop/tests/integration/project-lifecycle.state-machine.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/projectLifecycle.guard.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/project-purge.concurrent.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/project-purge.permission.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/projectLifecycle.persistence-failure.test.ts`
  - `pnpm exec tsx apps/desktop/tests/perf/project-lifecycle.benchmark.test.ts`
- Scenario mapping result:
  - PM2-S1 ~ PM2-S10 全部通过。

### 2026-02-08 23:27 Benchmark/NFR 证据

- Command: `pnpm exec tsx apps/desktop/tests/perf/project-lifecycle.benchmark.test.ts`
- Exit code: `0`
- Threshold judgment:
  - 用例内断言已覆盖并通过：
    - `switch p95 < 1000ms`
    - `switch p99 < 2000ms`
    - `archive p95 < 600ms`
    - `restore p95 < 800ms`
    - `purge p95 < 2000ms`

### 2026-02-08 23:28 额外回归与契约幂等验证

- Command: `pnpm exec tsx apps/desktop/tests/unit/projectService.projectActions.test.ts`
- Exit code: `0`
- Key output:
  - `projectService.projectActions.test.ts: all assertions passed`

- Command: `pnpm -C apps/desktop exec vitest run renderer/src/features/dashboard/Dashboard.open-project.test.tsx renderer/src/features/dashboard/Dashboard.search.test.tsx renderer/src/features/dashboard/Dashboard.empty-state.test.tsx`
- Exit code: `0`
- Key output:
  - `Test Files 3 passed (3)`

- Command: `git diff -- packages/shared/types/ipc-generated.ts > /tmp/issue307-ipc-before-final.diff && pnpm contract:generate && git diff -- packages/shared/types/ipc-generated.ts > /tmp/issue307-ipc-after-final.diff && diff -u /tmp/issue307-ipc-before-final.diff /tmp/issue307-ipc-after-final.diff`
- Exit code: `0`
- Conclusion:
  - 契约生成结果稳定（无二次漂移）。

### 2026-02-08 23:29 交付前治理校验

- Command: `rulebook task validate issue-307-project-management-p1-lifecycle-switch-delete`
- Exit code: `0`
- Key output:
  - `✅ Task issue-307-project-management-p1-lifecycle-switch-delete is valid`

- Command: `gh auth status`
- Exit code: `0`
- Key output:
  - `Logged in to github.com account Leeky1017`

### 2026-02-08 23:40 PR #313 门禁失败（windows-e2e）

- Command: `gh pr checks 313`
- Exit code: `1`
- Key output:
  - `windows-e2e fail`
  - 其余 required checks：`merge-serial pass`、`openspec-log-guard pass`、`contract-check pass`、`unit-test pass`
- Command: `gh run view 21800766671 --job 62895795096 --log-failed`
- Exit code: `0`
- Key output:
  - `knowledge-graph.spec.ts`：`kg-entity-create` 未找到
  - `system-dialog.spec.ts`：`kg-entity-name` 未找到
  - `project-lifecycle.spec.ts`：`project:project:delete` 断言失败（active 直接删除返回 `ok=false`）
- Root cause:
  - KG E2E 仍假设默认 List 视图，但当前默认视图为 Graph；
  - 生命周期 E2E 仍假设 active 项目可直接删除，与 PM2 `active -> archived -> deleted` 约束不一致。

### 2026-02-08 23:45 本地修复与定向回归

- Edited:
  - `apps/desktop/tests/e2e/knowledge-graph.spec.ts`
  - `apps/desktop/tests/e2e/system-dialog.spec.ts`
  - `apps/desktop/tests/e2e/project-lifecycle.spec.ts`
- Fix summary:
  - KG 相关用例进入知识图谱后先显式切换到 `List` 再执行实体 CRUD；
  - 生命周期用例改为先断言 active 直接 `project:lifecycle:purge` 返回 `PROJECT_DELETE_REQUIRES_ARCHIVE`，再执行 `archive -> purge`。
- Command: `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `Lockfile is up to date`
- Command: `pnpm -C apps/desktop test:e2e -- tests/e2e/knowledge-graph.spec.ts tests/e2e/project-lifecycle.spec.ts tests/e2e/system-dialog.spec.ts`
- Exit code: `0`
- Key output:
  - `3 passed`
