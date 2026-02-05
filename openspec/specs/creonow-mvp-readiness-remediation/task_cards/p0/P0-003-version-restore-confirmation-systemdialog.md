# P0-003: Restore 确认统一（SystemDialog）

Status: todo

## Goal

修复两处 restore 缺确认的 TODO：所有 restore 必须先弹 SystemDialog 确认，再执行 `version:restore`。

> 审评报告定位：
> - `apps/desktop/renderer/src/components/layout/AppShell.tsx:414`
> - `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx:254`

## Assets in Scope

- `apps/desktop/renderer/src/components/layout/AppShell.tsx`（DiffViewPanel restore）
- `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx`（VersionHistoryPanel restore）
- `apps/desktop/renderer/src/hooks/useConfirmDialog.ts`（复用）
- `apps/desktop/renderer/src/components/features/AiDialogs/SystemDialog.tsx`

## Dependencies

- Spec: `../spec.md#cnmvp-req-003`
- Design: `../design/03-version-preview-and-restore-confirm.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/renderer/src/components/layout/AppShell.tsx`（restore 前 confirm） |
| Update | `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx`（restore 前 confirm） |
| Update | `apps/desktop/tests/e2e/version-history.spec.ts`（restore 需确认） |
| Update | `apps/desktop/tests/e2e/system-dialog.spec.ts`（若需要补充断言/选择器） |

## Detailed Breakdown

1. 在 AppShell（compareMode 分支）实现确认：
   - 调用 `useConfirmDialog()`，渲染 `<SystemDialog {...dialogProps} />`
   - Restore 按钮点击后：
     1) `await confirm({ title, description, ... })`
     2) confirmed 才 `invoke(\"version:restore\", ...)`
2. 在 VersionHistoryContainer 实现确认：
   - 同样使用 `useConfirmDialog`
   - confirmed 才执行 restore
3. 统一确认文案（写死，见 Design 03）
4. E2E：
   - 断言点击 restore 会先看到 dialog
   - 点击 Cancel 不执行 restore（版本不变化）
   - 点击 Restore 才执行，并且 editor 内容刷新

## Acceptance Criteria

- [ ] 两处 TODO 均移除
- [ ] 所有 restore 都先确认；取消不执行 restore
- [ ] restore 成功后：
  - [ ] compareMode 路径：关闭 DiffViewPanel，并重新 bootstrap editor
  - [ ] version panel 路径：刷新 list，并刷新 editor（若需要，写死实现）
- [ ] E2E 覆盖确认对话框与 restore 行为

## Tests

- [ ] `pnpm -C apps/desktop test:e2e -- --grep \"version history\"`（或等价定位）

## Edge cases

- restore 执行中再次点击 restore：
  - 必须禁用按钮或展示 in-progress（避免重复请求）
- restore 失败：
  - UI 必须可见错误（错误码可见）

## Observability

- renderer：restore 失败必须记录（临时允许 console.warn；P2 收敛 logger）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

