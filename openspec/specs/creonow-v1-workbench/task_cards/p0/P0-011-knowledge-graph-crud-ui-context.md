# P0-011: Knowledge Graph（CRUD + UI + context integration）

Status: pending

## Goal

交付知识图谱最小可用：kg_entities/kg_relations schema + IPC CRUD + Sidebar 面板可视化，并能作为上下文来源进入 context viewer（受 `context_rules.knowledge_graph` 控制）。

## Dependencies

- Spec: `../spec.md#cnwb-req-090`
- Design: `../design/08-knowledge-graph.md`
- Design: `../design/04-context-engineering.md`（context integration）
- P0-004: `./P0-004-sqlite-bootstrap-migrations-logs.md`
- P0-008: `./P0-008-context-engineering-viewer-redaction-watch.md`
- P0-010: `./P0-010-skill-system-packages-validator-ui.md`（context_rules）

## Expected File Changes

| 操作   | 文件路径                                                                                      |
| ------ | --------------------------------------------------------------------------------------------- |
| Update | `apps/desktop/main/src/db/migrations/0001_init.sql`（kg_entities/kg_relations 表与索引）      |
| Add    | `apps/desktop/main/src/ipc/knowledgeGraph.ts`（`kg:*` channels）                              |
| Add    | `apps/desktop/main/src/services/kg/kgService.ts`（CRUD + metadata size limit）                |
| Add    | `apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.tsx`（`data-testid="sidebar-kg"`） |
| Add    | `apps/desktop/renderer/src/stores/kgStore.ts`                                                 |
| Update | `apps/desktop/renderer/src/components/layout/Sidebar.tsx`（新增 KG tab 入口）                 |
| Add    | `apps/desktop/tests/e2e/knowledge-graph.spec.ts`                                              |

## Acceptance Criteria

- [ ] DB schema：
  - [ ] `kg_entities/kg_relations` 表存在
  - [ ] `metadata_json` 大小限制（建议 <= 32KB）：
    - [ ] 超限返回 `INVALID_ARGUMENT`（不得 silent truncate）
- [ ] IPC：
  - [ ] `kg:graph:get` 返回 entities + relations
  - [ ] `kg:entity:*` 与 `kg:relation:*` CRUD 可用且错误码稳定
- [ ] UI：
  - [ ] Sidebar 存在 KG 入口（稳定选择器：`sidebar-kg`）
  - [ ] 打开面板会加载图谱并展示（最小：列表即可）
  - [ ] 支持创建/更新/删除实体与关系（允许先做简化表单）
- [ ] Context integration：
  - [ ] 当 skill 声明 `knowledge_graph: true` 时，context viewer 中出现 KG 内容（结构化格式）

## Tests

- [ ] E2E（Windows）`knowledge-graph.spec.ts`
  - [ ] 打开 KG 面板 → 创建实体 → 列表出现 → 删除后消失
  - [ ] 运行一个启用 KG 注入的 skill → 打开 context viewer → 断言存在 KG 注入内容或引用

## Edge cases & Failure modes

- 删除实体时仍有关系引用 → 必须定义语义（级联删除或拒绝），并用稳定错误码表示
- DB 错误 → `DB_ERROR`；UI 显示可读错误并提供重试

## Observability

- `main.log` 记录：
  - `kg_entity_created/updated/deleted`
  - `kg_relation_created/updated/deleted`
  - `kg_injected`（count，不含明文）
