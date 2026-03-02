更新时间：2026-03-02 20:10

## 1. Implementation

- [x] 1.1 `dragHandle.ts` — 纯函数 contract（`createDragHandleDecoration`、`DragHandleExtension` 形状）
- [x] 1.2 `aiStreamUndo.ts` — `buildAiStreamUndoCheckpoint` helper（捕获 EditorState 快照）
- [x] 1.3 `EditorPane.tsx` — 集成 `aiStreamCheckpointRef`，流式写入前调用 checkpoint
- [x] 1.4 `useOverflowDetection.ts` — ResizeObserver hook，返回 `visibleCount`
- [x] 1.5 `EditorToolbar.tsx` — 溢出检测集成 + "More" 下拉菜单渲染

## 2. Testing

- [x] 2.1 `dragHandle.test.ts` — 3 个测试（decoration 创建、元素结构、空 doc 安全性）
- [x] 2.2 `Editor.ai-stream-undo.test.tsx` — 4 个测试（checkpoint 捕获、恢复、清除、空状态安全性）
- [x] 2.3 `EditorToolbar.overflow.test.tsx` — 3 个测试（全部可见、溢出折叠、More 菜单交互）
- [x] 2.4 全量回归 221 文件 / 1655 测试全绿

## 3. Documentation

- [x] 3.1 RUN_LOG `openspec/_ops/task_runs/ISSUE-916.md` 已记录 Red/Green/回归/主会话初审修复
