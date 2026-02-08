# 提案：document-management-p1-file-tree-organization

## 背景

`document-management-p0-crud-types-status` 已完成并归档，文档类型、CRUD IPC 与状态流转的 P0 基线已具备。
主规范中的“文件树与章节组织”属于高交互复杂度需求（拖拽、层级、菜单、键盘、空态、Storybook 验收），需要独立 change 分治交付，避免与引用/导出能力耦合。

## 变更内容

- 将“文件树与章节组织”拆分为独立 change：`document-management-p1-file-tree-organization`。
- 按 Spec-first + TDD 执行，覆盖并交付以下能力：
  - 拖拽排序（`file:document:reorder` 持久化）
  - 文件夹层级移动（`parentId` 更新持久化）
  - 右键菜单（重命名/删除/复制/移动到文件夹/标记状态）
  - 键盘导航（Arrow Up/Down/Left/Right、Enter、F2、Delete）
  - 空态文案与首个文档创建入口
  - Storybook 场景覆盖（多层级、空态、拖拽态、右键菜单态、键盘导航态）

## 依赖关系

- 前置依赖：`openspec/changes/archive/document-management-p0-crud-types-status/`（P0 基线）。
- 与 `document-management-p1-reference-and-export`：无硬依赖，仅为同模块并行拆分项；当前通过执行顺序文档串行推进以降低冲突风险。

## 受影响范围

- OpenSpec:
  - `openspec/changes/document-management-p1-file-tree-organization/specs/document-management/spec.md`
  - `openspec/changes/document-management-p1-file-tree-organization/tasks.md`
  - `openspec/changes/EXECUTION_ORDER.md`
- Renderer:
  - `apps/desktop/renderer/src/features/files/FileTreePanel.tsx`
  - `apps/desktop/renderer/src/features/files/FileTreePanel.stories.tsx`
  - `apps/desktop/renderer/src/stores/fileStore.ts`
- Tests:
  - `apps/desktop/renderer/src/features/files/FileTreePanel*.test.tsx`
  - `apps/desktop/renderer/src/features/files/FileTreePanel.storybook-coverage.test.ts`

## 不做什么

- 不修改主 spec：`openspec/specs/document-management/spec.md`。
- 不在本批引入“文档间互相引用”“文档导出”实现（由后续 change 负责）。

## 审阅状态

- Owner 审阅：`APPROVED`
- Apply 状态：`DONE`
- Archive 状态：`PENDING`（待 PR 合并后归档收口）
