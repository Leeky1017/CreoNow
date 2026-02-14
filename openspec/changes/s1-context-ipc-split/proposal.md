# 提案：s1-context-ipc-split

## 背景

`docs/plans/unified-roadmap.md` 将 `s1-context-ipc-split`（A7-C-004）定义为 Sprint 1 的 IPC 注册层解耦项：当前 `registerContextIpcHandlers` 在单文件内承载 `context:assemble/*`、`context:budget/*`、`context:fs/*` 多类通道与部分内联业务处理，导致 `context.ts` 体积膨胀、改动扇出高、契约回归风险上升。

该 change 目标是把“通道分组注册”与“业务逻辑调用”的边界拉直，降低单体聚合器负担，并为后续 Context 侧演进提供可维护入口。

## 变更内容

- 将 `context.ts` 中 `guardedIpcMain.handle(...)` 按 channel 前缀拆分到三个子注册器：
  - `context:assemble:*` + `context:inspect:*` → `contextAssembly.ts`
  - `context:budget:*` → `contextBudget.ts`
  - `context:fs:*` → `contextFs.ts`
- `context.ts` 收敛为聚合注册器，仅保留 `registerContextIpcHandlers(deps)` 的编排职责。
- 子注册器仅负责“参数校验 + handler 注册 + service 调用路由”，避免在子文件重复实例化 `createKnowledgeGraphService`、`createMemoryService`、`createContextLayerAssemblyService` 等依赖。
- 通过测试验证注册通道归属、聚合委托关系与实例化次数约束，防止拆分后行为漂移。

## 受影响模块

- IPC（`apps/desktop/main/src/ipc/`）
  - `context.ts`（聚合注册器）
  - `contextAssembly.ts`（组装/检查通道）
  - `contextBudget.ts`（预算通道）
  - `contextFs.ts`（文件系统相关通道）
- Context Engine（`apps/desktop/main/src/services/context/`）
  - 仅作为被调用方与依赖注入来源，本 change 不改其业务语义。

## 依赖关系

- 前置依赖：`s1-break-context-cycle`（先完成 Context 装配链路解耦，再进行 IPC 注册拆分）。
- 并行关系：可与 Sprint 1 Wave 2 的 `s1-ipc-acl`、`s1-runtime-config` 并行推进，但不得互改非本 change 目标路径。
- 下游影响：后续涉及 Context IPC 扩展的 change 需复用本次拆分后的子注册器边界。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s1-context-ipc-split` 条目（A7-C-004）与依赖图；
  - `openspec/changes/s1-break-context-cycle/proposal.md` 与 `specs/context-engine-delta.md`；
  - `openspec/specs/ipc/spec.md` 中通道命名与运行时校验要求。
- 核对项：
  - 上游 `s1-break-context-cycle` 已将 Context 共享类型/工具函数从装配门面解耦，避免 IPC 拆分阶段引入新循环；
  - 本 change 只做 IPC 注册层拆分，不改通道契约语义与错误包络；
  - 依赖实例由聚合层统一创建并注入，子注册器不得重复创建。
- 结论：`NO_DRIFT`（与 roadmap 定义一致）；进入 Red 前需再次复核 `s1-break-context-cycle` 最新产出，若发现漂移先更新本 change 文档再继续。

## 踩坑提醒（防复发）

- 通道迁移时必须按前缀一次性搬迁，避免同一前缀分散到多个文件导致注册顺序难以追踪。
- `context.ts` 拆分后最常见回归是“子文件重复 new service”，需要以依赖注入方式保持单次实例化。
- 子注册器容易夹带业务重构；本 change 只允许搬运与轻量解耦，不做语义增强。
- 测试必须覆盖“注册器调用关系”与“实例化次数”，避免只测 happy path 导致伪绿。

## 防治标签

`MONOLITH` `ADDONLY` `DUP` `FAKETEST`

## 不做什么

- 不新增、删除或重命名任何 `context:*` IPC channel。
- 不改变 `context:assemble`、`context:budget:*`、`context:fs:*` 的请求/响应契约与错误码语义。
- 不在本 change 内重构 Context Engine 业务算法（token 估算、role 规范化、层组装策略）。
- 不处理非 Context 域 IPC（例如 `ai:*`、`knowledge:*`）。

## 审阅状态

- Owner 审阅：`PENDING`
