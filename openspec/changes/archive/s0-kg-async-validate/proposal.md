# 提案：s0-kg-async-validate

## 背景

Sprint 0 紧急止血项（来源：A6-H-003）。

当前 `KnowledgeGraphPanel.tsx` 存在多处异步写入调用在完成后未检查 `ServiceResult.ok`，导致失败被当作成功处理（静默失败/幽灵状态），进而出现 UI 状态被错误清空、偏好被错误保存、批量更新部分失败不透明等问题。

## 变更内容

- 对 `relationDelete` / `entityUpdate` 等异步写入结果进行显式校验：`ok:false` 时不得继续执行后续成功路径副作用。
- 批量更新从 `Promise.all` 改为 `Promise.allSettled`，支持部分失败的可观测汇报（失败数量/错误提示），避免单点失败导致整体行为不确定。

## 受影响模块

- Knowledge Graph（Renderer）— `KnowledgeGraphPanel.tsx` 的异步写入链路与 UI 状态更新；新增对应测试覆盖。

## 依赖关系

- 依赖 `s0-metadata-failfast`（同触 `KnowledgeGraphPanel.tsx`，执行顺序需先 metadata fail-fast 再异步校验）。
- 串行约束：在 `s0-metadata-failfast` 文档与实现落地前，不进入本 change 的 Red 阶段。

## Dependency Sync Check

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s0-kg-async-validate` 条目；
  - `openspec/changes/s0-metadata-failfast/specs/knowledge-graph-delta.md`；
  - `openspec/specs/knowledge-graph/spec.md` 中 KG 异步写入与失败处理相关要求。
- 核对项：
  - `s0-metadata-failfast` 引入的 `parseMetadataJson(): Record<string, unknown> | null` 不影响本 change 的 `ServiceResult.ok` 校验路径；
  - 两者虽然同改 `KnowledgeGraphPanel.tsx`，但关注点分别为“metadata 解析 fail-fast”与“异步写入结果校验”；
  - 批量更新 `allSettled` 方案与上游 metadata 解析策略不存在语义冲突。
- 结论：`NO_DRIFT`（维持串行执行：先 `s0-metadata-failfast`，后 `s0-kg-async-validate`）。

## 踩坑提醒

- 错误提示必须复用 `KnowledgeGraphPanel` 现有机制（如已有 toast / error state）；不要新造一套提示通道导致重复链路与风格漂移。

## 防治标签

- `SILENT` `GHOST` `DUP` `FAKETEST`

## 不做什么

- 不引入新的异步任务系统/队列抽象（仅在现有调用点增加校验与错误处理）。
- 不新增新的错误提示框架（复用既有错误提示机制；若缺失则升级给 Owner 决策）。
- 不修改 KG 数据模型、IPC schema、错误码命名空间（仅消费既有 `ServiceResult`）。

## 审阅状态

- Owner 审阅：`PENDING`
