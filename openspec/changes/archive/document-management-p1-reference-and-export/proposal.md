# 提案：document-management-p1-reference-and-export

## 背景

`document-management-p0-crud-types-status` 已完成并归档，文档生命周期基础能力已有可用基线。当前主规范中“文档间互相引用”和“文档导出”仍与其他能力混合描述，若不拆分为独立 change，将增加后续实现与验收的耦合风险，且不利于批次化交付与 TDD 映射。

## 变更内容

- 将 Document Management 的第 3 批次范围拆分为单独 change，仅覆盖 2 个 requirement：
  - 文档间互相引用
  - 文档导出
- 在 delta spec 中明确以下强制覆盖点：
  - 被引用文档删除后的失效引用处理
  - 导出进度可见性（阶段/百分比）
  - 导出失败错误码可见性（含失败策略）
  - 单文档导出路径选择
  - 项目导出路径选择
- 在 `tasks.md` 中建立完整 Scenario → Test 映射，并保留 Red/Green 证据位，不进入代码实现。

## 受影响模块

- `openspec/changes/document-management-p1-reference-and-export/**`（本次仅 OpenSpec 拆分）
- 后续实现预计影响（本次不改动）：`apps/desktop/main/src/services/documents/`、`apps/desktop/main/src/services/export/`、`apps/desktop/renderer/src/features/editor/`、`apps/desktop/renderer/src/features/export/`

## 不做什么

- 不修改主 spec：`openspec/specs/document-management/spec.md`
- 不进行任何生产代码实现
- 不新增/修改测试代码，仅在 `tasks.md` 建立映射与证据位
- 不扩展到文件树组织、并发冲突、大文件性能等本批次之外能力

## 审阅状态

- Owner 审阅：`APPROVED`
- Apply 状态：`DONE`（本 change 仅完成 OpenSpec 拆分与门禁定义，不进入实现）
