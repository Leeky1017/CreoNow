# 提案：workbench-p5-03-rightpanel-statusbar

## 背景

两个严重缺陷需要在本 change 中修正：

1. **S0-1 RightPanel 双层 Tab 嵌套**：AiPanel 内部有 `activeTab: "assistant" | "info"` 子 tab，与 RightPanel 外层 tab 形成双层嵌套。用户看到两层 Info——内层是占位文字，外层是真正的文档统计面板，信息架构混乱。
2. **S1-2 StatusBar 信息严重不足**：Spec 要求左侧显示项目名称/文档名称、右侧显示字数统计/保存状态/当前时间，当前仅显示 `autosaveStatus` 原始值和容量警告。

此外，`Cmd/Ctrl+L` 从折叠打开时未强制切到 AI tab，`activeRightPanel` 未持久化。

## 变更内容

- **RightPanel Tab 收敛**：按 Change 00 delta spec，RightPanel 保留 AI + Info + Quality 三个 tab（移除 AiPanel 内部子 tab）
- **AiPanel 子 tab 消除**：删除 `AiPanel.tsx` 内部的 `activeTab: "assistant" | "info"` 状态及其 sub-tab header，AiPanel 只渲染 AI 对话功能
- **AiPanel 内部 InfoPanel 删除**：删除 `AiPanel.tsx:329-337` 的占位 InfoPanel 函数
- **`Cmd/Ctrl+L` 语义修正**：从折叠打开时强制 `setActiveRightPanel("ai")`
- **activeRightPanel 持久化**：持久化到 `creonow.layout.activeRightPanel`，扩展 `prefKey` 允许值
- **StatusBar 左侧**：添加项目名称（`projectStore.current.name`）、文档名称
- **StatusBar 右侧**：添加字数统计、保存状态完整状态机（idle/saving/saved/error + 样式区分）、当前时间（每分钟刷新）
- **StatusBar Storybook**：正常态、保存中态、保存错误态

## 受影响模块

- Workbench — `renderer/src/components/layout/RightPanel.tsx`、`renderer/src/components/layout/StatusBar.tsx`、`renderer/src/components/layout/AppShell.tsx`
- AI Service — `renderer/src/features/ai/AiPanel.tsx`（移除内部 sub-tab）
- Store — `renderer/src/stores/layoutStore.tsx`（`activeRightPanel` 持久化、`prefKey` 扩展）

## 依赖关系

- 上游依赖：
  - `workbench-p5-00-contract-sync` — RightPanel tab 类型决定（AI + Info + Quality）
- 下游依赖：
  - `workbench-p5-05-hardening-gate` — 依赖本 change 完成后再做去抖、zod 校验等

## 不做什么

- 不修改 AiPanel 的 AI 对话功能本身（仅删除 sub-tab 和内部占位 InfoPanel）
- 不实现 `Cmd/Ctrl+L` 去抖（→ Change 05）
- 不实现 zod 校验（→ Change 05）
- 不实现右侧面板折叠按钮（→ Change 05）

## 审阅状态

- Owner 审阅：`PENDING`
