# Proposal: issue-401-version-control-p1-ai-mark-preview

## Why

`version-control-p0` 已完成快照与历史入口基线，但 `openspec/changes/version-control-p1-ai-mark-preview` 规划的两块关键行为仍未闭环：一是 AI 修改区分显示偏好（`creonow.editor.showAiMarks`）尚未贯通设置与历史列表；二是历史版本预览仍停留在弹窗读内容，未切换主编辑区只读预览，也没有顶部提示条与返回当前版本链路。若不完成该 change，`version-control-p2` 的 Diff/回滚入口会建立在错误的预览交互上，持续放大后续漂移成本。

## What Changes

- 以 TDD 完成 `version-control-p1-ai-mark-preview` 四个 Scenario：
  - 开启 AI 区分显示时，历史列表展示 `AI 修改` 标签；
  - 默认关闭时不展示该标签；
  - 点击历史版本进入主编辑区只读预览；
  - 从预览返回当前版本恢复可编辑状态。
- 将历史预览状态收敛到 `versionStore` 的单一状态机（loading/ready/error/idle）。
- 在编辑器中新增预览提示条，包含「恢复到此版本」（占位入口）与「返回当前版本」按钮。
- 使预览模式下工具栏禁用、编辑区只读。
- 打通设置页与 `creonow.editor.showAiMarks` 偏好持久化。
- 完成 RUN_LOG、preflight、required checks、auto-merge、main 收口与 cleanup。

## Impact

- Affected specs:
  - `openspec/changes/version-control-p1-ai-mark-preview/proposal.md`
  - `openspec/changes/version-control-p1-ai-mark-preview/tasks.md`
  - `openspec/changes/version-control-p1-ai-mark-preview/specs/version-control-delta.md`
- Affected code:
  - `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx`
  - `apps/desktop/renderer/src/features/version-history/VersionHistoryPanel.tsx`
  - `apps/desktop/renderer/src/features/editor/EditorPane.tsx`
  - `apps/desktop/renderer/src/features/editor/EditorToolbar.tsx`
  - `apps/desktop/renderer/src/stores/versionStore.tsx`
  - `apps/desktop/renderer/src/features/settings-dialog/SettingsDialog.tsx`
  - `apps/desktop/renderer/src/features/settings-dialog/SettingsGeneral.tsx`
  - `apps/desktop/renderer/src/stores/versionPreferencesStore.ts`（新增）
  - `apps/desktop/renderer/src/**/*.test.tsx`
- Breaking change: NO
- User benefit: 历史版本预览交互与 AI 区分显示偏好对齐 spec，形成可验证、可扩展的 Version Control p1 基线。
