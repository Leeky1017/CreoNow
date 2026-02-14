# 提案：s1-break-context-cycle

## 背景

`docs/plans/unified-roadmap.md` 在 Sprint 1 的 `s1-break-context-cycle`（A5-C-001）指出：`layerAssemblyService.ts` 与多个 fetcher 之间存在反向类型依赖，且 `retrievedFetcher` 通过 `rulesFetcher` 间接复用格式化函数，形成装配层与 fetcher 层闭环。

该闭环会放大后续拆分风险（尤其是 `s1-context-ipc-split`），并让 Context Engine 的依赖边界持续退化为单体耦合。

## 变更内容

- 将 Context 共享类型从 `layerAssemblyService.ts` 提取到独立 `types.ts`，收口为单一类型源。
- 将实体格式化纯函数提取到 `utils/formatEntity.ts`，消除 fetcher 间接互相依赖。
- 调整 `layerAssemblyService` 与各 fetcher 的 import 边界：fetcher 仅依赖 `types.ts` 与 `utils`，不再反向依赖装配门面。
- 明确新增循环依赖门禁（`madge --circular`）与编译门禁（`pnpm tsc --noEmit`）作为验收证据。

## 受影响模块

- Context Engine（`apps/desktop/main/src/services/context/`）  
  重点影响：`layerAssemblyService.ts`、`fetchers/*.ts`、新增 `types.ts` 与 `utils/formatEntity.ts` 的职责边界。

## 依赖关系

- 上游依赖：无（Sprint 1 Wave 1 独立项）。
- 下游依赖：`s1-context-ipc-split` 依赖本 change 先打断循环后再拆分 IPC 装配链路。
- 并行关系：可与 `s1-path-alias`、`s1-break-panel-cycle`、`s1-scheduler-error-ctx` 并行。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s1-break-context-cycle` 条目与内部依赖图；
  - `openspec/specs/context-engine/spec.md` 中“上下文组装 API”与分层组装约束；
  - 当前 Context fetcher 契约（`formatEntityForContext` 复用路径与 `layerAssemblyService` 类型导出路径）。
- 核对项：
  - 目标仅为依赖解耦，不改变四层上下文语义与 `context:assemble` 对外契约；
  - 类型定义必须单源，禁止“复制后并存”；
  - `formatEntityForContext` 必须从独立 utility 导出，避免跨 fetcher 传递依赖。
- 结论：`NO_DRIFT`（进入 TDD）。

## 踩坑提醒（防复发）

- 类型提取必须“剪切并收口”，避免 `layerAssemblyService.ts` 与 `types.ts` 双源并存。
- `formatEntityForContext` 迁移后需全量搜索旧 import，防止残留 `retrievedFetcher -> rulesFetcher` 依赖。
- 循环检测范围必须覆盖 `apps/desktop/main/src/services/context/`，只看单文件无法发现闭环。
- 本 change 仅做解耦，不在同一补丁混入行为增强，避免噪音变更掩盖依赖问题。

## 防治标签

`MONOLITH` `ADDONLY` `DUP` `NOISE`

## 不做什么

- 不改动 Context 四层组装顺序、预算算法、裁剪策略与 warnings 语义。
- 不新增/修改 IPC 通道、返回结构或错误码。
- 不扩展 `rules/retrieved/settings` 的业务能力，仅处理依赖拓扑与文件职责边界。

## 审阅状态

- Owner 审阅：`PENDING`
