# P0-014: Project lifecycle（create/list/setCurrent/getCurrent/delete + ensure `.creonow`）

Status: done

## Goal

补齐 V1 的“本地入口 + project 生命周期”闭环：projectId/rootPath 稳定、current project 可持久化可恢复，并在创建项目时确保 `<projectRoot>/.creonow/` 目录结构存在，支撑后续 documents/filetree、skills(project scope)、context watch 与 Windows E2E 的可重复入口。

## Dependencies

- Spec: `../spec.md#cnwb-req-005`
- Spec: `../spec.md#cnwb-req-001`（Windows-first）
- Design: `../design/11-project-and-documents.md`
- Design: `../design/04-context-engineering.md`（`.creonow` 结构与 ensure）
- P0-002: `./P0-002-ipc-contract-ssot-and-codegen.md`
- P0-004: `./P0-004-sqlite-bootstrap-migrations-logs.md`（projects 表与 settings）
- P0-001: `./P0-001-windows-ci-windows-e2e-build-artifacts.md`（E2E 门禁）

## Expected File Changes

| 操作   | 文件路径                                                                                                       |
| ------ | -------------------------------------------------------------------------------------------------------------- |
| Add    | `apps/desktop/main/src/ipc/project.ts`（`project:*` channels）                                                 |
| Add    | `apps/desktop/main/src/services/projects/projectService.ts`（create/list/delete + current project）            |
| Update | `apps/desktop/main/src/db/migrations/0001_init.sql`（确保 `projects` + `settings` 表字段满足本卡需求）         |
| Add    | `apps/desktop/renderer/src/features/welcome/WelcomeScreen.tsx`（本地入口；`data-testid="welcome-screen"`）     |
| Add    | `apps/desktop/renderer/src/features/projects/CreateProjectDialog.tsx`（`data-testid="create-project-dialog"`） |
| Add    | `apps/desktop/renderer/src/stores/projectStore.ts`（project list/current project 状态）                        |
| Add    | `apps/desktop/tests/e2e/project-lifecycle.spec.ts`                                                             |

## Acceptance Criteria

- [x] `project:create`：
  - [x] 返回 `{ projectId, rootPath }`
  - [x] `rootPath` 支持空格/中文路径（Windows 常见）
  - [x] 创建完成后 `.creonow/` 目录结构已被 ensure（`context:creonow:ensure` 或等价）
- [x] `project:list`：
  - [x] 返回 deterministic 排序（写死排序规则并可测）
- [x] `project:setCurrent/getCurrent`：
  - [x] `setCurrent` 成功后 `getCurrent` 返回一致结果
  - [x] app 重启后 current project 仍可恢复（settings 持久化）
- [x] `project:delete`：
  - [x] 删除后 `project:list` 不再返回该项目
  - [x] 对已删除 `projectId` 的访问返回 `NOT_FOUND`（不得 silent fallback）
- [x] UI（最小可用）：
  - [x] 存在 `welcome-screen`，并能打开 `create-project-dialog` 完成创建

## Tests

- [x] E2E（Windows）`project-lifecycle.spec.ts`
  - [x] 启动 → 创建 project → `project:getCurrent` 返回 projectId
  - [x] 断言 `.creonow/` 已存在（可通过 `context:creonow:status` 或等价可测路径）
  - [x] 重启 app → `project:getCurrent` 仍返回同 projectId

## Edge cases & Failure modes

- `CREONOW_USER_DATA_DIR` 含空格/中文（Windows 常见）→ 仍可 create/list/getCurrent
- 删除当前项目 → 必须清空 current 并返回 `NOT_FOUND`（行为写死）
- 创建项目时 FS 权限问题 → `IO_ERROR`，UI 提示“打开日志/重试”

## Observability

- `main.log` 关键行（结构化，至少包含）：
  - `project_created`（projectId, rootPathRelative）
  - `project_set_current`（projectId）
  - `project_deleted`（projectId）

## Completion

- Issue: #25
- PR: #26
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-25.md`
