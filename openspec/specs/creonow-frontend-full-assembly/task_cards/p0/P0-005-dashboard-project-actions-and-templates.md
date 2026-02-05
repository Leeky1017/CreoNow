# P0-005: Dashboard 项目操作闭环 + 模板语义补齐

Status: todo

## Goal

把 Dashboard 与创建项目流程补齐到“完全可用”：

- Dashboard 的 rename / duplicate / archive / delete 全部可用
- CreateProjectDialog 的模板/描述/封面字段至少要有明确语义（不误导用户）
- 所有 destructive 操作使用统一 SystemDialog（禁止 `window.confirm`）

## Dependencies

- Spec: `../spec.md#cnfa-req-004`
- Spec: `../spec.md#cnfa-req-003`
- Design: `../design/03-ipc-reservations.md`（新增 project:* 通道）
- P0-012: `./P0-012-aidialogs-systemdialog-and-confirm-unification.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/main/src/ipc/contract/ipc-contract.ts`（新增 `project:rename/duplicate/archive`） |
| Update | `packages/shared/types/ipc-generated.ts`（codegen 输出） |
| Update | `apps/desktop/main/src/services/projects/projectService.ts`（实现 rename/duplicate/archive） |
| Update | `apps/desktop/main/src/ipc/project.ts`（新增 IPC handlers） |
| Update | `apps/desktop/main/src/db/migrations/*.sql`（若 archive 需要新字段/表） |
| Update | `apps/desktop/renderer/src/stores/projectStore.ts`（新增 actions + 错误状态） |
| Update | `apps/desktop/renderer/src/features/dashboard/DashboardPage.tsx`（实现操作与 UI 状态） |
| Update | `apps/desktop/renderer/src/features/projects/CreateProjectDialog.tsx`（模板/描述/封面字段语义、错误处理、禁用态） |
| Add/Update | `apps/desktop/tests/e2e/dashboard-project-actions.spec.ts`（新增门禁） |

## Acceptance Criteria

- [ ] IPC（project 扩展）：
  - [ ] `project:rename` 可用，错误码稳定（INVALID_ARGUMENT/NOT_FOUND/DB_ERROR）
  - [ ] `project:duplicate` 可用，复制后新项目出现在列表中且可打开
  - [ ] `project:archive` 可用，归档后按设计从默认列表隐藏（或显示 Archived 分组，必须写死语义）
- [ ] Dashboard UI：
  - [ ] Rename：输入新名字后列表立刻更新；重启后仍保持
  - [ ] Duplicate：新项目出现；进入编辑器不崩溃
  - [ ] Archive：归档后 UI 状态一致（不会“仍能打开已归档项目”且无提示）
  - [ ] Delete：必须二次确认；删除后从列表消失；若删除的是 current project，AppShell 状态必须一致（回到 Dashboard/Welcome）
- [ ] CreateProjectDialog：
  - [ ] 不允许 silent catch（禁止 `catch {}`）
  - [ ] 模板/描述/封面字段：
    - [ ] 若暂不支持持久化/应用，必须在 UI 上明确标注（例如“Coming soon”并禁用输入），避免误导
    - [ ] 若支持模板应用：必须创建对应文档结构（可用 `file:document:create + write`），并在 Files 可见
- [ ] 确认对话框统一：
  - [ ] 删除项目使用 `SystemDialog`（来自 `Features/AiDialogs`）

## Tests

- [ ] E2E `dashboard-project-actions.spec.ts`：
  - [ ] 创建项目 → 在 Dashboard 可见
  - [ ] Rename → 列表更新 → 重启仍更新
  - [ ] Duplicate → 新项目出现 → 可 setCurrent 并进入 editor
  - [ ] Archive → 默认列表隐藏（或进入 Archived 分组）
  - [ ] Delete → 弹 SystemDialog → 确认删除 → 列表移除
- [ ] 更新/复用 `project-lifecycle.spec.ts`（不得回归）

## Edge cases & Failure modes

- project 名称为空/超长/包含特殊字符：
  - 必须 `INVALID_ARGUMENT` 且 message 可理解
- 删除不存在的 projectId：
  - 必须 `NOT_FOUND`（不得 silent no-op）
- 归档后的项目再 setCurrent：
  - 必须定义行为（拒绝并提示 / 允许但 UI 标注），不得出现“状态错乱”

## Observability

- main.log 必须记录：
  - `project_renamed` / `project_duplicated` / `project_archived` / `project_deleted`
  - 记录 `project_id` 与必要字段（禁止敏感信息）

## Manual QA (Storybook WSL-IP)

- [ ] Storybook `Features/Dashboard/DashboardPage` 与 `Features/CreateProjectDialog`：
  - [ ] 卡片操作按钮的 hover/focus/禁用态正确
  - [ ] 对话框布局与错误态文案正确（留证到 RUN_LOG）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

