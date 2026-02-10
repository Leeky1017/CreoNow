# 提案：version-control-p1-ai-mark-preview

## 背景

版本快照与历史展示（version-control-p0）就绪后，需要补齐两个显示层功能：AI 修改标记的可选区分显示，以及历史版本的只读预览模式。

## 变更内容

- 实现 AI 修改标记与区分显示：
  - 默认不区分 AI 修改与用户修改。
  - 用户可在设置中开启「区分 AI 修改」（`creonow.editor.showAiMarks`）。
  - 开启后：版本历史中 AI 版本标注「AI 修改」标签（`--color-info` 背景）；Diff 对比中 AI 修改使用虚线下划线，用户修改使用实线下划线。
  - 偏好持久化到设置存储。
- 实现版本预览：
  - 点击版本记录 → 主编辑区切换为只读预览模式。
  - 预览模式顶部提示条：「正在预览 [时间] 的版本」+ 「恢复到此版本」按钮 + 「返回当前版本」按钮。
  - 提示条样式：`--color-bg-raised` 背景、`--color-border-default` 下边框。
  - 预览模式下编辑器工具栏禁用。
  - 「返回当前版本」恢复可编辑状态。

## 受影响模块

- Version Control（`renderer/src/features/version-history/`、`renderer/src/stores/versionStore.tsx`）
- Editor（预览模式下的只读状态切换）

## 依赖关系

- 上游依赖：
  - `version-control-p0-snapshot-history`（版本历史列表、快照读取 IPC）
  - `editor-p0-tiptap-foundation-toolbar`（编辑器只读模式切换、工具栏禁用）
- 下游依赖：`version-control-p2`（预览中的「恢复到此版本」入口）、`version-control-p4`

## 不做什么

- 不实现版本 Diff 对比（→ version-control-p2）
- 不实现版本回滚的完整流程（→ version-control-p2，本 change 仅提供按钮入口占位）
- 不实现 Diff 中 AI 修改虚线下划线的实际渲染（→ version-control-p2 配合 editor-p2 的 Diff 组件）

## 审阅状态

- Owner 审阅：`PENDING`
