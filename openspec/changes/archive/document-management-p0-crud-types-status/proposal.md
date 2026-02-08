# 提案：document-management-p0-crud-types-status

## 背景

`document-management` 主规范覆盖范围较大（文件树高级组织、引用、导出、异常边界等），直接整体推进会提高实现风险。该 change 先聚焦 P0 基线，以最小闭环落地文档生命周期核心能力，作为后续能力迭代基座。

## 变更内容

- 将 Document Management 的 P0 基线拆分为单独 change，仅覆盖 3 个 requirement：
  - 文档 CRUD 的 IPC 通道
  - 文档类型体系
  - 文档状态管理
- 在 delta spec 中为上述 requirement 建立可测试 Scenario。
- 在 `tasks.md` 建立完整 Scenario → Test 映射，并按 Red → Green → Refactor 推进实现与验证。

## 受影响模块

- `openspec/changes/document-management-p0-crud-types-status/**`
- `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- `apps/desktop/main/src/ipc/file.ts`
- `apps/desktop/main/src/services/documents/documentService.ts`
- `apps/desktop/main/src/db/migrations/0011_document_type_status.sql`
- `apps/desktop/main/src/db/init.ts`
- `apps/desktop/renderer/src/stores/fileStore.ts`
- `apps/desktop/renderer/src/stores/editorStore.tsx`
- `apps/desktop/renderer/src/stores/aiStore.ts`
- `apps/desktop/renderer/src/features/files/FileTreePanel.tsx`
- `apps/desktop/renderer/src/features/editor/EditorPane.tsx`
- `packages/shared/types/ipc-generated.ts`
- 对应单测 / 组件测试 / E2E 测试与 Storybook 夹具

## 不做什么

- 不包含文件树拖拽、文件夹组织、键盘导航等能力。
- 不包含文档互引、导出、并发冲突与大文件边界处理。
- 不修改主 spec：`openspec/specs/document-management/spec.md`。
- 不在本 change 中引入新技术栈或跨模块设计重构。

## 审阅状态

- Owner 审阅：`APPROVED`
- Apply 状态：`DONE`
