# Design 03 — Version Preview & Restore Confirmation

> Spec: `../spec.md#cnmvp-req-002`、`../spec.md#cnmvp-req-003`
>
> Related cards:
> - `../task_cards/p0/P0-002-version-history-preview-dialog.md`
> - `../task_cards/p0/P0-003-version-restore-confirmation-systemdialog.md`

## 1) Preview（只读查看）的 UI 决策

### 1.1 为什么不用 diff view 代替 preview

Compare 的目标是差异；Preview 的目标是“看原文”。二者都存在，但语义不同：

- Compare：看差异 + 决定是否 restore
- Preview：像“快照”一样查看某版本内容（只读）

因此 Preview 必须展示完整内容，而不是 diff 片段。

### 1.2 Preview 实现形态（写死）

Preview MUST 实现为一个 modal Dialog（primitives `Dialog`）：

- 触发：VersionHistoryPanel 的 Preview 按钮 / hover actions
- 内容：
  - 元信息：actor、reason、timestamp、contentHash
  - 正文：显示 `version:read.contentText`（纯文本，避免 HTML/XSS；保留换行）
- 行为：
  - 只读：不允许编辑，不触发 autosave，不触发 `file:document:write`
  - 关闭：Esc / Close button / 点击遮罩
  - 可选按钮（允许）：`Restore this version`（但必须走确认对话框）

> 为什么用 contentText 而不是 HTML：Preview 的目标是可读 + 安全；富文本预览属于 P2+。

## 2) Restore Confirmation（两处 TODO 的统一口径）

Restore 的确认必须覆盖两条链路：

1. AppShell Compare（`DiffViewPanel`）里的 Restore
2. Sidebar VersionHistoryPanel 列表里的 Restore

确认对话框必须统一使用 `useConfirmDialog`（SystemDialog）：

- title: `Restore this version?`
- description: `Your current content will be replaced. This action cannot be undone.`
- primaryLabel: `Restore`
- secondaryLabel: `Cancel`

并且 restore 执行后必须：

- 重新 bootstrap editor（确保 editor 内容与 DB 一致）
- 刷新 version list（确保 UI 与 DB 一致）
- 退出 compareMode（若来自 DiffViewPanel）

## 3) 错误处理与可观测性（最低要求）

- restore 失败必须可见（toast 或 ErrorState），并包含错误码（便于 E2E 断言）
- 禁止 silent failure：任何 catch 必须记录（renderer 允许临时 console.warn，但最终要收敛到 logger；见 P2-004）

