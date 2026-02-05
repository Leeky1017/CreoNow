# P0-007: Version History（compare/diff/restore 闭环 + `version:read`）

Status: todo

## Goal

把版本历史从“UI 组件”补齐为真实可用闭环：

- list：从后端读取版本列表并分组显示
- compare：获取历史版本内容 → 与当前文档生成 diff → 展示 Diff surface
- restore：确认后恢复指定版本 → editor/索引/版本一致

并且消除当前 placeholder：

- `useVersionCompare` 不再生成假内容
- AppShell compare mode 不再传 `diffText=""` / `TODO restore`

## Dependencies

- Spec: `../spec.md#cnfa-req-006`
- Design: `../design/03-ipc-reservations.md`（新增 `version:read`）
- P0-012: `./P0-012-aidialogs-systemdialog-and-confirm-unification.md`（restore 确认对话框统一）

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/main/src/ipc/contract/ipc-contract.ts`（新增 `version:read` schema） |
| Update | `packages/shared/types/ipc-generated.ts`（codegen 输出） |
| Update | `apps/desktop/main/src/services/documents/documentService.ts`（新增读取版本内容的方法） |
| Update | `apps/desktop/main/src/ipc/version.ts`（实现 `version:read` handler） |
| Add | `apps/desktop/renderer/src/stores/versionStore.ts`（或在 editorStore 中扩展；必须显式依赖注入） |
| Update | `apps/desktop/renderer/src/features/version-history/useVersionCompare.ts`（改为真实 fetch + diff） |
| Update | `apps/desktop/renderer/src/components/layout/AppShell.tsx`（接入 compare state，展示 Diff surface，restore 真实现） |
| Update | `apps/desktop/renderer/src/components/layout/Sidebar.tsx`（VersionHistory panel 使用真实 timeGroups + onCompare/onRestore） |
| Add | `apps/desktop/tests/e2e/version-history.spec.ts`（新增门禁） |

## Acceptance Criteria

- [ ] list：
  - [ ] VersionHistoryPanel 显示真实 versions（来自 `version:list`）
  - [ ] 分组标签与排序规则写死且可测试（例如：Today/Yesterday/Earlier 或按日期）
- [ ] compare：
  - [ ] 点击 compare → 打开 Diff surface（具备稳定 `data-testid`）
  - [ ] diff 文本来自真实历史内容（`version:read`）与当前内容
  - [ ] 关闭 compare 返回 editor（状态复原）
- [ ] restore：
  - [ ] 点击 restore → 弹统一 SystemDialog 确认
  - [ ] 确认后调用 `version:restore`，并刷新 editor 内容
  - [ ] restore 失败时显示错误码与说明（可 dismiss）
- [ ] 不再存在占位实现：
  - [ ] `useVersionCompare` 无假文案/假 diff
  - [ ] AppShell compare mode 不再 `diffText=""`

## Tests

- [ ] E2E `version-history.spec.ts`：
  - [ ] 创建项目/文档 → 输入内容 → 保存/触发版本（actor=user/auto 任一）
  - [ ] 再修改内容形成差异
  - [ ] 打开 Version History → 断言至少 1 条版本存在
  - [ ] Compare 某版本 → 断言 Diff 可见且包含预期文本差异
  - [ ] Restore 某版本 → 确认后 editor 内容回滚（断言文本恢复）

## Edge cases & Failure modes

- 当前文档未保存/无版本：
  - UI 必须显示空态与引导（例如“Save to create versions”）
- 历史版本内容损坏/无法解析：
  - `version:read` 必须返回可判定错误（INVALID_ARGUMENT/DB_ERROR），UI 不崩溃

## Observability

- main.log 必须记录：
  - `version_read`（可选）
  - `version_restored`（documentId, versionId）
- renderer 必须在 UI 显示 restore/compare 的错误信息（禁止 silent）

## Manual QA (Storybook WSL-IP)

- [ ] Storybook `Features/VersionHistoryPanel` 与 `Features/DiffView`：
  - [ ] 对比/恢复按钮的 hover/focus/禁用态正确（留证到 RUN_LOG）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

