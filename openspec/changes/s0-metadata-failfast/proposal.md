# 提案：s0-metadata-failfast

## 背景

Sprint 0 紧急止血项（来源：A2-H-002 + A2-H-003）。

当前在 Knowledge Graph 相关链路中存在“metadata JSON 解析失败 → 静默降级为 `{}` → 随后写入 `ui.position` / `timeline.order` → 覆盖原有 metadata”的行为，导致**数据丢失**且难以察觉。

## 变更内容

- metadata JSON 解析失败时 **fail-fast**：不再降级为 `{}` 并继续写入；改为保留原始 metadata（不覆盖、不回写）。
- `KnowledgeGraphPanel` 中 `parseMetadataJson` 在非法 JSON 时返回 `null`（而非 `{}`），调用方必须显式处理 `null` 并停止后续写入。

## 受影响模块

- Knowledge Graph（Renderer）— `kgToGraph.ts` 与 `KnowledgeGraphPanel.tsx` 的 metadata 解析与写入路径；新增对应测试覆盖。

## 依赖关系

- 上游依赖：无（Sprint0 并行组 B 的首项）。
- 下游依赖：`s0-kg-async-validate`（同触 `KnowledgeGraphPanel.tsx`，需先稳定 metadata fail-fast 契约）。

## Dependency Sync Check

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s0-metadata-failfast` 条目；
  - `openspec/specs/knowledge-graph/spec.md` 中 KG 面板写入与错误处理相关要求。
- 核对项：
  - 非法 metadata JSON 不得被默认对象覆盖；
  - `parseMetadataJson` 非法输入返回 `null`，调用方必须 fail-fast；
  - 为 `s0-kg-async-validate` 保持可预期的 helper 返回语义。
- 结论：`NO_DRIFT`（可作为 `s0-kg-async-validate` 的前置变更进入实施）。

## 不做什么

- 不引入新的 metadata schema/migration。
- 不新增/替换全局 toast/notification 机制（错误提示复用既有机制，若不存在则升级给 Owner 决策）。
- 不扩展到其他非 KG 相关模块的 metadata 解析逻辑。

## 审阅状态

- Owner 审阅：`PENDING`
