# Proposal: issue-311-kg-e2e-default-graph-mode

## Why

KG2 已将知识图谱面板默认视图切换为 Graph，旧 E2E 仍假设进入面板后立即可见 List 视图控件（`kg-entity-name` / `kg-entity-create`），导致 CI 出现误报失败并掩盖真实回归信号。

## What Changes

- 对现有用例做最小修复，不新增业务功能：
  - `knowledge-graph.spec.ts`：进入 KG 后先断言默认 Graph，再切换到 List 执行原 CRUD 流程。
  - `system-dialog.spec.ts`：进入 KG 后先切换 List，再执行实体创建/删除确认流程。
- 保持原有断言目标与覆盖范围，仅修正前置交互路径。

## Impact

- Affected specs: 无（行为不变，测试对齐既有行为）
- Affected code:
  - `apps/desktop/tests/e2e/knowledge-graph.spec.ts`
  - `apps/desktop/tests/e2e/system-dialog.spec.ts`
- Breaking change: NO
- User benefit: Windows E2E 与产品真实交互保持一致，减少误报并提高门禁可信度。
