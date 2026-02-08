# Proposal: issue-271-document-management-p0-crud-types-status

## Why

Document Management 主规范覆盖能力较多，P0 需要先落地最小闭环（CRUD IPC、类型、状态）以支撑后续文件树高级能力、引用和导出能力；同时当前通道命名与类型合同存在分散，缺少对状态切换和类型显示的端到端验证。

## What Changes

- 新增并收敛文档 IPC 合同到 `create/read/update/save/delete/list/getcurrent/reorder/updatestatus`
- 扩展文档数据结构（`type/status/sort_order/parent_id`）并增加 SQLite migration `0011_document_type_status.sql`
- 文档服务增加 `update` / `save` / `reorder` / `updateStatus` 能力，删除最后文档时自动补建空白章节
- 渲染层增加文档类型创建入口与图标展示、`final` 状态标识及编辑确认降级
- 补齐对应单测、组件测试、E2E 调整和共享 IPC 生成类型

## Impact

- Affected specs: `openspec/changes/document-management-p0-crud-types-status/**`
- Affected code: `apps/desktop/main/**`, `apps/desktop/renderer/**`, `packages/shared/types/ipc-generated.ts`, `apps/desktop/tests/**`, `package.json`
- Breaking change: YES（移除旧通道 `file:document:rename` / `file:document:write`）
- User benefit: 文档创建/编辑/状态管理具备统一合同与可验证行为，P0 基线可交付并可持续演进
