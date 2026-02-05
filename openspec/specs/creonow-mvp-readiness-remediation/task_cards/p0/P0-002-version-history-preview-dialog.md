# P0-002: Version History Preview（只读预览 Dialog）

Status: todo

## Goal

实现 Version History 的 Preview 功能：点击 Preview 后展示该版本的真实内容（来自 `version:read`），并且为只读模式。

> 审评报告定位：`apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx:269` 仅 `console.log` 占位。

## Assets in Scope

- `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx`
- `apps/desktop/renderer/src/features/version-history/VersionHistoryPanel.tsx`（不改其 UI 结构，仅利用 onPreview 回调）
- IPC：复用既有 `version:read`（不新增通道）

## Dependencies

- Spec: `../spec.md#cnmvp-req-002`
- Design: `../design/03-version-preview-and-restore-confirm.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx`（实现 handlePreview） |
| Add | `apps/desktop/renderer/src/features/version-history/VersionPreviewDialog.tsx`（或等价文件名） |
| Add/Update | `apps/desktop/renderer/src/features/version-history/VersionPreviewDialog.test.tsx`（Vitest：打开/关闭/错误态） |
| Update | `apps/desktop/tests/e2e/version-history.spec.ts`（E2E：Preview 打开与内容可见） |

## Detailed Breakdown

1. 实现 `VersionPreviewDialog`
   - 使用 primitives `Dialog`
   - 展示元信息：actor/reason/timestamp/contentHash
   - 正文展示 `contentText`（纯文本，保留换行；禁止 innerHTML）
2. `VersionHistoryContainer.handlePreview`
   - 调用 `invoke(\"version:read\", { documentId, versionId })`
   - 成功：打开 dialog 并渲染内容
   - 失败：打开 dialog 并展示错误态（错误码可见）
3. 移除占位 `console.log`
4. 补测试：
   - Vitest：Preview 按钮触发打开；Close 关闭；错误态可见
   - E2E：在真实 app 中打开 VersionHistory → 点击某版本 Preview → 看到 dialog 与内容

## Acceptance Criteria

- [ ] Preview 点击后展示 Dialog（可通过 `data-testid` 断言）
- [ ] Dialog 展示来自 `version:read` 的 `contentText`（不是 mock/占位）
- [ ] Preview 为只读：用户无法编辑，且不触发保存/写入
- [ ] `console.log(\"Preview version\")` 被移除
- [ ] IPC 错误可见（包含错误码）

## Tests

- [ ] `pnpm -C apps/desktop test:run` 覆盖 PreviewDialog 的交互测试
- [ ] `pnpm -C apps/desktop test:e2e` 覆盖预览打开与关闭（Windows CI 绿）

## Edge cases

- versionId 不存在：UI 显示 `NOT_FOUND`
- 快速连续点击不同版本 Preview：
  - 之前请求可被覆盖（以最后一次点击为准），但不得出现“显示旧内容”

## Observability

- renderer 允许临时 `console.warn` 记录 `version_preview_failed`（P2 会收敛 logger）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

