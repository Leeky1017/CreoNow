# Proposal: issue-308-knowledge-graph-p1-visualization-extended-views

## Why
`knowledge-graph-p1-visualization-extended-views` 是 KG 主 spec 的渲染层关键阶段。若不落地关系图、时间线与角色卡三类视图，KG 数据无法形成可操作的创作工作流，且会阻塞后续 KG-3 自动识别与 AI 利用能力的 UI 承载。

## What Changes
- 按 change tasks 完整交付 KG2 场景对应测试与实现：
  - 关系图：力导向渲染、空态、拖拽与缩放交互
  - 扩展视图：时间线拖拽排序、角色卡列表与空态
  - Storybook：关系图三态 + 角色卡三态快照覆盖
- 严格采用 Red → Green → Refactor，并补全 RUN_LOG 证据。
- 最终将完成的 change 归档并收口到控制面 `main`。

## Impact
- Affected specs:
  - `openspec/changes/knowledge-graph-p1-visualization-extended-views/**`
- Affected code:
  - `apps/desktop/renderer/src/features/kg/**`
  - `apps/desktop/renderer/src/features/character/**`
  - `apps/desktop/renderer/src/components/features/KnowledgeGraph/**`
  - `apps/desktop/renderer/src/components/layout/Sidebar.tsx`
- Breaking change: NO
- User benefit: 在知识图谱与角色入口获得一致、可交互、可扩展的可视化视图，提升世界观管理效率与可读性。
