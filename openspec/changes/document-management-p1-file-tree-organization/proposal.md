# 提案：document-management-p1-file-tree-organization

## 背景

`document-management-p0-crud-types-status` 已完成并归档，文档类型、CRUD IPC 与状态流转的 P0 基线已具备。
主规范中的“文件树与章节组织”仍是高复杂度聚合需求（拖拽、层级、菜单、键盘交互、空态、Storybook），需要拆分为独立 change，避免后续实现与验收跨域耦合。

## 变更内容

- 新增独立 change：`document-management-p1-file-tree-organization`，仅覆盖一个 requirement：文件树与章节组织。
- 在 delta spec 中将以下能力拆分为可验证 Scenario：拖拽排序、文件夹层级、右键菜单、键盘导航、空态、Storybook 覆盖要求。
- 在 `tasks.md` 建立完整 Scenario -> Test 映射，并将 Red 失败证据设置为进入实现前的硬门槛。

## 依赖关系

- 前置依赖：`openspec/changes/archive/document-management-p0-crud-types-status/`（批次 1，已归档）。
- 后续依赖：文档间互相引用、文档导出等 requirement 在后续批次单独拆分，不纳入本 change。

## 受影响模块

- `openspec/changes/document-management-p1-file-tree-organization/proposal.md`
- `openspec/changes/document-management-p1-file-tree-organization/tasks.md`
- `openspec/changes/document-management-p1-file-tree-organization/specs/document-management/spec.md`
- `openspec/changes/EXECUTION_ORDER.md`（活跃 change 状态同步）

## 不做什么

- 不修改主 spec：`openspec/specs/document-management/spec.md`。
- 不进行实现代码、测试代码、Storybook 代码改动。
- 不包含“文档间互相引用”“文档导出”等非本 requirement 内容。
- 不在本批执行 Apply/Archive，仅完成 OpenSpec 拆分准备。

## 审阅状态

- Owner 审阅：`PENDING`
- Apply 状态：`TODO`
