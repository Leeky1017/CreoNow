## 1. Implementation

- [x] 1.1 完成文件树层级与可见节点模型，支持文件夹展开/折叠。
- [x] 1.2 完成拖拽排序与拖入文件夹交互，并持久化到 `file:document:reorder` / `file:document:update`。
- [x] 1.3 完成右键菜单（Rename/Delete/Copy/Move/Status）与键盘导航（Arrow/Enter/F2/Delete）。
- [x] 1.4 完成空态文案与“新建文件”入口。

## 2. Testing

- [x] 2.1 Red：新增拖拽、菜单、键盘、空态、Storybook 覆盖测试并记录失败证据。
- [x] 2.2 Green：新增测试通过，既有 `FileTreePanel` 相关测试回归通过。
- [x] 2.3 执行交付门禁校验：`pnpm typecheck`、`pnpm lint`、`pnpm contract:check`、`pnpm test:unit`。

## 3. Documentation

- [x] 3.1 更新 `openspec/changes/document-management-p1-file-tree-organization/{proposal.md,tasks.md}`。
- [x] 3.2 更新 `openspec/changes/EXECUTION_ORDER.md`（活跃 change 依赖与顺序同步）。
- [x] 3.3 记录 `openspec/_ops/task_runs/ISSUE-278.md`（Red/Green/门禁证据）。
