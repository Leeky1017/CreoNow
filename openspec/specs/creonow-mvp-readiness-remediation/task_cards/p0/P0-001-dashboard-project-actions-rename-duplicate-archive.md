# P0-001: Dashboard 项目操作闭环（rename / duplicate / archive）

Status: todo

## Goal

把 Dashboard 的三个占位入口补齐为“真实可用”：

- Rename：可改名、可持久化、列表即时刷新
- Duplicate：复制为一个新项目（新 projectId/rootPath），并可进入编辑器使用
- Archive：归档并从默认列表移出，且**必须可恢复（Unarchive）**

> 审评报告定位：`apps/desktop/renderer/src/features/dashboard/DashboardPage.tsx:397` 三个 handler 仅 `console.log` 占位。

## Assets in Scope（对应 App Surface）

- `apps/desktop/renderer/src/features/dashboard/DashboardPage.tsx`（ProjectCard menu actions）
- `apps/desktop/renderer/src/stores/projectStore.tsx`
- main: `apps/desktop/main/src/services/projects/projectService.ts`
- main IPC: `apps/desktop/main/src/ipc/project.ts`

## Dependencies

- Spec: `../spec.md#cnmvp-req-001`
- Design: `../design/02-dashboard-project-actions.md`
- Design: `../design/09-parallel-execution-and-conflict-matrix.md`（`ipc-contract.ts` 串行）
- Upstream reference (do not execute): `openspec/specs/creonow-frontend-full-assembly/task_cards/p0/P0-005-dashboard-project-actions-and-templates.md`

## Expected File Changes

| 操作       | 文件路径                                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Update     | `apps/desktop/main/src/ipc/contract/ipc-contract.ts`（新增 `project:rename/duplicate/archive`；扩展 `project:list`）         |
| Update     | `packages/shared/types/ipc-generated.ts`（codegen 输出）                                                                     |
| Add        | `apps/desktop/main/src/db/migrations/0010_projects_archive.sql`（新增 `projects.archived_at`）                               |
| Update     | `apps/desktop/main/src/services/projects/projectService.ts`（实现 rename/duplicate/archive）                                 |
| Update     | `apps/desktop/main/src/ipc/project.ts`（新增 IPC handlers + list payload 对齐）                                              |
| Update     | `apps/desktop/renderer/src/stores/projectStore.tsx`（新增 actions：rename/duplicate/archive；bootstrap list 包含 archived）  |
| Update     | `apps/desktop/renderer/src/features/dashboard/DashboardPage.tsx`（实现 3 个 handler + UI）                                   |
| Add        | `apps/desktop/renderer/src/features/dashboard/RenameProjectDialog.tsx`（rename 输入对话框）                                  |
| Add/Update | `apps/desktop/tests/e2e/dashboard-project-actions.spec.ts`（新增门禁）                                                       |
| Add        | `apps/desktop/tests/unit/projectService.projectActions.test.ts`（main 层最小单测，覆盖 rename/archive/duplicate 的核心语义） |

## Detailed Breakdown（建议拆分 PR）

> 注意：本任务会修改 `ipc-contract.ts` + codegen，必须串行执行。

1. PR-A（main + contract）：新增 IPC contract + main handlers + DB migration
   - 1.1 扩展 `project:list`
     - request 增加 `includeArchived?: boolean`（默认 false）
     - response 增加 `archivedAt: number | null`
   - 1.2 新增通道：
     - `project:rename`（见 Design 02）
     - `project:duplicate`（见 Design 02）
     - `project:archive`（同一通道支持 archive/unarchive：payload `{ archived: boolean }`）
   - 1.3 新增 DB migration：`projects.archived_at`（nullable）
   - 1.4 main `projectService` 实现：
     - rename：更新 name + updated_at
     - archive：更新 archived_at（true→nowTs, false→NULL）+ updated_at
     - duplicate：创建新项目 + 复制 documents（不复制 versions），并 best-effort 复制 `.creonow/`
   - 1.5 更新 `project.ts` IPC handlers（注意：当前 handler 未接收 `project:list` payload，必须与 contract 对齐）
   - 1.6 运行并通过：
     - `pnpm contract:generate`
     - `pnpm contract:check`
     - `pnpm test:unit`（至少包含本任务新增单测）

2. PR-B（renderer）：ProjectStore actions + Dashboard UI 闭环
   - 2.1 `projectStore.tsx` 新增 actions：
     - `renameProject(projectId, name)`
     - `duplicateProject(projectId)`
     - `setProjectArchived(projectId, archived)`
   - 2.2 DashboardPage：
     - 实现 `handleRename`：打开 `RenameProjectDialog`，保存后调用 store action，错误可见
     - 实现 `handleDuplicate`：调用 store action，完成后列表刷新并可点击打开
     - 实现 `handleArchive`：确认后调用 store action；并支持 Unarchive（Archived 分组里的菜单项）
     - 移除 3 处 `console.log`（禁止占位）
   - 2.3 Dashboard 必须展示 Archived 分组（写死最小 UX）：
     - 默认 Active 列表不含 archived
     - 若存在 archived 项，在页面底部展示 `Archived`（可展开/收起；默认收起）
   - 2.4 运行并通过：
     - `pnpm -C apps/desktop test:run`（新增/更新组件测试按需）

3. PR-C（E2E gate）：新增 `dashboard-project-actions.spec.ts`
   - 覆盖：创建项目 → rename/duplicate/archive/unarchive → 重启保持
   - 运行并通过（本地可先跑 linux；CI windows 必须绿）：
     - `pnpm -C apps/desktop test:e2e -- --grep \"dashboard project actions\"`（或等价定位方式）

## Conflict Notes（并行约束）

- `apps/desktop/main/src/ipc/contract/ipc-contract.ts` 与 `packages/shared/types/ipc-generated.ts` 必冲突：同一时间只能 1 个 PR 修改。
- DB migration 文件编号必须递增且不可重写：新增 `0010_*`，禁止改旧 migration（避免破坏历史）。

## Acceptance Criteria

- [ ] Rename：
  - [ ] Dashboard menu → Rename 打开输入对话框，输入校验明确
  - [ ] Save 成功后列表立即更新，重启后仍保持
  - [ ] 空/全空白/超长名称返回 `INVALID_ARGUMENT`，UI 需展示错误码
- [ ] Duplicate：
  - [ ] Dashboard menu → Duplicate 成功后出现新项目（新 projectId/rootPath）
  - [ ] 新项目可 setCurrent 并进入 Editor，不崩溃
  - [ ] 复制范围符合 Design 02（documents 复制；versions 不复制；`.creonow/` best-effort）
- [ ] Archive / Unarchive：
  - [ ] Archive 必须确认；确认后项目从 Active 列表移出
  - [ ] 页面存在 Archived 分组，且能看到被归档项目
  - [ ] Unarchive 必须确认；确认后项目回到 Active 列表
- [ ] IPC 语义：
  - [ ] `project:list` 返回 `archivedAt`，且 `includeArchived` 行为符合约定
  - [ ] 新增通道错误码稳定（INVALID_ARGUMENT/NOT_FOUND/DB_ERROR）

## Tests

- [ ] Unit（main）：
  - [ ] `apps/desktop/tests/unit/projectService.projectActions.test.ts` 覆盖：
    - rename 的输入校验 + 更新落库
    - archive/unarchive 的 archived_at 语义
    - duplicate 创建新 project + 复制 documents（至少 1 个 doc）
- [ ] E2E（Windows gate）：
  - [ ] `apps/desktop/tests/e2e/dashboard-project-actions.spec.ts` 覆盖：
    - create project → Dashboard 可见
    - rename → 列表更新 → 重启仍更新
    - duplicate → 新项目出现 → 打开进入 editor
    - archive → Active 隐藏 + Archived 可见
    - unarchive → 回到 Active

## Edge cases & Failure modes

- duplicate 时源项目不存在 → `NOT_FOUND`
- archive/unarchive 重复调用（幂等）：
  - archive 已 archive 的项目：保持 archived_at 不变或更新（必须写死；推荐保持不变）
  - unarchive 已 unarchived 的项目：no-op 但返回 ok
- `.creonow/` copy 失败：
  - 不得阻断 duplicate，但必须写 main log（可观测）

## Observability

main.log 必须记录（info/error）：

- `project_renamed`
- `project_duplicated`
- `project_archived` / `project_unarchived`

字段至少包含：`project_id`（duplicate 还要包含 `new_project_id`）。

## Manual QA (Storybook / App)

- [ ] App 内实际点击 Dashboard menu：
  - [ ] 对话框布局与 token 使用符合 `design/system/README.md` 与 `design/system/01-tokens.css`
  - [ ] Disabled/loading/error 状态可感知且不抖动

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`
