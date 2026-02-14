# IPC Specification Delta

## Change: s1-context-ipc-split

### Requirement: Context IPC 注册必须按 channel 前缀拆分并由聚合注册器统一编排 [MODIFIED]

`registerContextIpcHandlers` 必须从单体注册函数拆分为按前缀分组的子注册器，并保持对外注册入口不变。聚合注册器负责统一依赖注入和子注册器编排，子注册器只负责本分组通道的参数校验、handler 注册和服务调用路由，不得在子文件重复实例化 Context 相关服务。

#### Scenario: SCIS-S1 按 channel 前缀拆分注册 [ADDED]

- **假设** Context 域包含 `context:assemble/*`、`context:inspect/*`、`context:budget/*`、`context:fs/*` 通道
- **当** 主进程注册 Context IPC handlers
- **则** `context:assemble/*` 与 `context:inspect/*` 必须由 `contextAssembly` 子注册器负责
- **并且** `context:budget/*` 仅由 `contextBudget` 子注册器负责，`context:fs/*` 仅由 `contextFs` 子注册器负责

#### Scenario: SCIS-S2 聚合注册器仅做编排委托 [ADDED]

- **假设** 执行 `registerContextIpcHandlers(deps)`
- **当** 聚合注册器完成初始化
- **则** 必须按固定顺序委托 `registerContextAssemblyHandlers(deps)`、`registerContextBudgetHandlers(deps)`、`registerContextFsHandlers(deps)`
- **并且** 聚合注册器不得继续内联各通道业务 handler 实现

#### Scenario: SCIS-S3 避免重复实例化 Context 服务依赖 [ADDED]

- **假设** Context IPC handlers 依赖 `createKnowledgeGraphService`、`createMemoryService`、`createContextLayerAssemblyService` 等 service
- **当** 完成 IPC 拆分并注册所有子通道
- **则** 依赖实例必须由聚合层统一创建并通过 `deps` 传入子注册器
- **并且** 任一子注册器不得重复创建同类服务实例，避免同一注册流程内出现重复实例化

## Out of Scope

- 新增/删除/重命名 Context IPC channel。
- 修改 Context 业务语义（token 估算、role 规范化、层组装策略）。
- 调整非 Context 域 IPC 模块。
