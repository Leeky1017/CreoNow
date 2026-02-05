# P0-009: Knowledge Graph 可视化组装（Graph view）

Status: todo

## Goal

把 `Features/KnowledgeGraph`（可视化组件）组装进真实 App Surface（Sidebar → Knowledge Graph），形成“CRUD + 可视化”双视图，并保持单一 SSOT（KG IPC）。

## Dependencies

- Spec: `../spec.md#cnfa-req-005`
- Design: `../design/01-asset-inventory-and-surface-map.md`（`Features/KnowledgeGraph` 当前为孤儿资产）
- Design: `../design/03-ipc-reservations.md`（复用 `kg:*`）
- P0-012: `./P0-012-aidialogs-systemdialog-and-confirm-unification.md`（删除确认）

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.tsx`（新增 Graph 视图切换；接入可视化组件） |
| Update | `apps/desktop/renderer/src/stores/kgStore.ts`（支持 metadataJson + 节点位置持久化） |
| Add | `apps/desktop/renderer/src/features/kg/kgToGraph.ts`（映射：KG entities/relations → graph nodes/edges） |
| Add | `apps/desktop/renderer/src/features/kg/kgToGraph.test.ts`（映射边界测试） |
| Add | `apps/desktop/tests/e2e/knowledge-graph-visualization.spec.ts`（新增门禁） |

## Acceptance Criteria

- [ ] Graph view 可达：
  - [ ] Sidebar → Knowledge Graph 中存在“Graph”切换入口（与 List/CRUD 互斥或并列，语义写死）
  - [ ] Graph view 渲染 nodes/edges（来自 `kg:graph:get`）
- [ ] 节点位置：
  - [ ] 节点拖拽后位置可持久化（建议存入 entity.metadataJson 的 `ui.position`）
  - [ ] 重启/刷新后位置保持
- [ ] CRUD 与可视化一致：
  - [ ] 在 CRUD 创建/删除实体后，Graph view 立即反映
  - [ ] 在 Graph view 新建/编辑/删除节点后，CRUD 列表立即反映
- [ ] 删除确认统一：
  - [ ] 删除节点/实体必须使用 SystemDialog（不得 `window.confirm`）

## Tests

- [ ] Unit `kgToGraph.test.ts`：
  - [ ] entityType 缺失 → 仍可渲染默认类型
  - [ ] metadataJson 非法 → 使用默认 position（不崩溃）
  - [ ] relation source/target 缺失 → 安全过滤（不崩溃）
- [ ] E2E `knowledge-graph-visualization.spec.ts`：
  - [ ] 创建项目 → 打开 KG → 创建实体
  - [ ] 切换到 Graph view → 断言 node 可见
  - [ ] 拖拽 node（或调用 handler）→ 刷新/重启 → 位置保持（可用存储字段断言）

## Edge cases & Failure modes

- 图很大（nodes 很多）：
  - Graph view 必须有性能降级策略（例如过滤/分页/最小可用交互），不得卡死
- metadataJson 写入失败：
  - 必须显示错误提示，不得 silent

## Observability

- KG 相关 IPC 失败必须可见（UI + error.code）

## Manual QA (Storybook WSL-IP)

- [ ] Storybook `Features/KnowledgeGraph`：
  - [ ] 拖拽/缩放/选择节点交互正确（留证到 RUN_LOG）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

