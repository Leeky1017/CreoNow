# ISSUE-136

- Issue: #136
- Branch: task/136-knowledge-graph-polish
- PR: https://github.com/Leeky1017/CreoNow/pull/137

## Plan

- 完整实现 KnowledgeGraph 组件：节点渲染、边渲染、交互功能
- 使用 Design Token 专用色 (--color-node-*)
- 复用原语组件 (Button/Badge/Avatar/Select/Textarea/Dialog)
- 实现节点编辑/创建对话框 (NodeEditDialog)
- 实现节点删除功能
- 实现键盘快捷键 (Escape/Delete)
- 补充单元测试和 Storybook stories

## Runs

### 2026-02-03 完整实现 KnowledgeGraph 组件

- Command: `pnpm -C apps/desktop test -- --run KnowledgeGraph`
- Key output: `48 tests passed`
- Evidence: `apps/desktop/renderer/src/components/features/KnowledgeGraph/KnowledgeGraph.test.tsx`

- Command: `pnpm -C apps/desktop lint`
- Key output: `0 errors, 1 warning (pre-existing)`
- Evidence: `apps/desktop/renderer/src/components/features/KnowledgeGraph/`

- Notes:
  - 新增 12 个文件：GraphNode/GraphEdge/GraphCanvas/GraphToolbar/GraphLegend/NodeDetailCard/NodeEditDialog/KnowledgeGraph 及 types/index/stories/test
  - 修复 Button 原语的 icon+text 对齐问题
  - 使用 key 属性强制 NodeEditDialog 重新挂载，避免 useEffect 中 setState 的 lint 错误
  - 重构测试以适配 Avatar/Select 原语的 DOM 结构
