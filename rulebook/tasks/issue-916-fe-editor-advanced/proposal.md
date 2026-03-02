# Proposal: issue-916-fe-editor-advanced

更新时间：2026-03-02 20:10

## Why

编辑器缺少块级拖拽手柄、AI 流式写入的原子撤销机制和工具栏溢出菜单。这三个交互增强是编辑器从"可用"到"好用"的关键一步。

## What Changes

- `extensions/dragHandle.ts`：纯函数 contract 形式的 Block Drag Handle 扩展
- `aiStreamUndo.ts`：`buildAiStreamUndoCheckpoint` helper，用于在 AI 写入前捕获编辑器状态快照
- `EditorPane.tsx`：集成 aiStreamCheckpoint ref，在流式写入前后管理快照
- `useOverflowDetection.ts`：基于 ResizeObserver 的工具栏溢出检测 Hook
- `EditorToolbar.tsx`：集成溢出检测，超出时折叠到 "More" 下拉菜单

## Impact

- Affected specs:
  - `openspec/changes/fe-editor-advanced-interactions/`
- Affected code:
  - `apps/desktop/renderer/src/features/editor/extensions/dragHandle.ts`
  - `apps/desktop/renderer/src/features/editor/aiStreamUndo.ts`
  - `apps/desktop/renderer/src/features/editor/useOverflowDetection.ts`
  - `apps/desktop/renderer/src/features/editor/EditorPane.tsx`
  - `apps/desktop/renderer/src/features/editor/EditorToolbar.tsx`
