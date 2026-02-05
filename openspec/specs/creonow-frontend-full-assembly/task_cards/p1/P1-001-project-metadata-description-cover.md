# P1-001: Project 元数据（描述/封面）持久化与展示

Status: todo

## Goal

让 CreateProjectDialog 中的“Description / Cover Image”从“看起来能填但不生效”变成真实能力：

- 创建项目时可保存 description 与封面图
- Dashboard 可展示（至少封面缩略图或描述摘要）

## Dependencies

- Spec: `../spec.md#cnfa-req-004`（项目闭环）
- Design: `../design/03-ipc-reservations.md`（可能需要扩展 project:create 或新增 project:updateMeta）
- P0-005: `../p0/P0-005-dashboard-project-actions-and-templates.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/main/src/db/migrations/*.sql`（projects 表新增字段：description/cover_path 等） |
| Update | `apps/desktop/main/src/ipc/contract/ipc-contract.ts`（扩展 `project:create` 或新增 `project:updateMeta`） |
| Update | `apps/desktop/main/src/services/projects/projectService.ts`（读写元数据） |
| Update | `apps/desktop/renderer/src/features/projects/CreateProjectDialog.tsx`（提交字段 + 错误处理） |
| Update | `apps/desktop/renderer/src/features/dashboard/DashboardPage.tsx`（展示元数据） |
| Add | `apps/desktop/tests/e2e/project-metadata.spec.ts`（新增门禁） |

## Acceptance Criteria

- [ ] 创建项目时保存 description：
  - [ ] Dashboard 可见（或详情可见）
- [ ] 上传封面：
  - [ ] 保存后可在 Dashboard 显示缩略图（或明确展示路径/占位）
  - [ ] 文件大小/格式限制清晰（与 UI 文案一致）
- [ ] 重启后仍保持（持久化）

## Tests

- [ ] E2E `project-metadata.spec.ts`：
  - [ ] 创建项目填写 description → 创建成功 → 展示可见
  - [ ] 上传封面 → 创建成功 → 缩略图可见

## Edge cases & Failure modes

- 图片过大/格式不支持：
  - 必须 `INVALID_ARGUMENT` 并提示可理解错误
- 存储失败（磁盘/权限）：
  - 必须可观察错误（UI + error.code）

## Manual QA (Storybook WSL-IP)

- [ ] Storybook `Features/CreateProjectDialog`：ImageUpload/错误态视觉正确（留证到 RUN_LOG）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

