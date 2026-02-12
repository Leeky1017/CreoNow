## 1. Specification

- [ ] 1.1 审阅 `workbench/spec.md:165-218` 中右侧面板全部 Requirement 和 Scenario
- [ ] 1.2 审阅 `workbench/spec.md:299-327` 中 StatusBar 全部 Requirement 和 Scenario
- [ ] 1.3 审阅 `AiPanel.tsx:329-337,437,1093-1206` 中 sub-tab 实现细节
- [ ] 1.4 审阅 `RightPanel.tsx:57-65` 中外层 tab 结构
- [ ] 1.5 审阅 `StatusBar.tsx:10-47` 中当前实现差距
- [ ] 1.6 审阅 `layoutStore.tsx:73-76,162-172` 中 `prefKey` 和 `activeRightPanel` 持久化缺失
- [ ] 1.7 依赖同步检查（Dependency Sync Check）：核对 Change 00 delta spec 确认的 RightPanel tab 类型（AI + Info + Quality）；结论待记录

## 2. TDD Mapping（先测前提）

- [ ] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [ ] 2.1 S-RightPanel 无嵌套「RightPanel 无双层 Tab 嵌套」→ `apps/desktop/renderer/src/components/layout/RightPanel.test.tsx`
- [ ] 2.2 S-AiPanel 无子 tab → `apps/desktop/renderer/src/features/ai/AiPanel.test.tsx`
- [ ] 2.3 S-Cmd/Ctrl+L「Cmd/Ctrl+L 从折叠打开默认 AI tab」→ `apps/desktop/renderer/src/components/layout/AppShell.test.tsx`
- [ ] 2.4 S-持久化「activeRightPanel 持久化与恢复」→ `apps/desktop/renderer/src/stores/layoutStore.test.ts`
- [ ] 2.5 S-StatusBar 完整信息「StatusBar 显示完整信息」→ `apps/desktop/renderer/src/components/layout/StatusBar.test.tsx`
- [ ] 2.6 S-保存状态机「StatusBar 保存状态完整状态机」→ `apps/desktop/renderer/src/components/layout/StatusBar.test.tsx`
- [ ] 2.7 S-保存重试「StatusBar 保存错误可重试」→ `apps/desktop/renderer/src/components/layout/StatusBar.test.tsx`

## 3. Red（先写失败测试）

- [ ] 3.1 编写 AiPanel 无 sub-tab 的失败测试（断言无 "ASSISTANT"/"INFO" 子标签）
- [ ] 3.2 编写 RightPanel 三 tab 结构（AI/Info/Quality，无内层嵌套）的失败测试
- [ ] 3.3 编写 `Cmd/Ctrl+L` 从折叠打开强制 AI tab 的失败测试
- [ ] 3.4 编写 `activeRightPanel` 持久化读写的失败测试
- [ ] 3.5 编写 StatusBar 完整信息（项目名/文档名/字数/时间）的失败测试
- [ ] 3.6 编写 StatusBar 保存状态机（idle→saving→saved→error + 重试）的失败测试
- [ ] 3.7 记录 Red 失败输出至 RUN_LOG

## 4. Green（最小实现通过）

- [ ] 4.1 删除 `AiPanel.tsx` 内部 `activeTab` 状态、sub-tab header、占位 InfoPanel 函数
- [ ] 4.2 确认 RightPanel 外层 tab 为 AI / Info / Quality
- [ ] 4.3 修正 `AppShell.tsx` 中 `Cmd/Ctrl+L` handler：折叠→展开时调用 `setActiveRightPanel("ai")`
- [ ] 4.4 扩展 `layoutStore.tsx` 的 `prefKey` 允许值，添加 `activeRightPanel` 持久化逻辑
- [ ] 4.5 补齐 `StatusBar.tsx` 左侧：项目名称（读 `projectStore`）、文档名称（读 `editorStore`/`fileStore`）
- [ ] 4.6 补齐 `StatusBar.tsx` 右侧：字数统计、保存状态机（idle/saving/saved 2s/error + 点击重试）、当前时间（每分钟刷新）

## 5. Refactor（保持绿灯）

- [ ] 5.1 提取 StatusBar 保存状态指示器为独立组件 `SaveIndicator`
- [ ] 5.2 补齐 Storybook Story：StatusBar 正常态/保存中态/保存错误态；RightPanel 修正后三 tab 态
- [ ] 5.3 全量回归保持绿灯

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [ ] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作
