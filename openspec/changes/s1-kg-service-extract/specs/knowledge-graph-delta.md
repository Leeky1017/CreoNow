# Knowledge Graph Specification Delta

## Change: s1-kg-service-extract

### Requirement: KG Service 必须完成 query/write 子服务拆分并保持门面契约稳定 [ADDED]

系统必须将 KG 单体服务拆分为独立的 query/write 子服务，并由 `kgService.ts` 作为统一门面委托调用。拆分后对外 `KnowledgeGraphService` 契约保持稳定，同时关键类型与上下文注入能力必须保持可见导出路径，避免下游依赖断链。

#### Scenario: KG-S1-KSE-S1 query/write 职责拆分为独立子服务 [ADDED]

- **假设** `s1-kg-service-extract` 完成 `kgQueryService.ts` 与 `kgWriteService.ts` 提取
- **当** 系统检查 KG 服务职责边界
- **则** `kgQueryService` 仅承载查询与规则注入能力（含 `queryRelevant/queryByIds/buildRulesInjection`）
- **并且** `kgWriteService` 仅承载实体/关系写路径能力（create/read/update/delete/list）
- **并且** 不得通过复制逻辑形成 query/write 双份实现分叉

#### Scenario: KG-S1-KSE-S2 门面层委托保持对外契约不变 [ADDED]

- **假设** 调用方继续通过 `createKnowledgeGraphService` 获取 `KnowledgeGraphService`
- **当** 调用 entity/relation/query 相关方法
- **则** `kgService.ts` 必须将调用委托给对应 query/write 子服务
- **并且** 对外方法签名、`ServiceResult` 包络与错误语义保持与拆分前一致
- **并且** 不要求调用方修改现有导入与调用方式

#### Scenario: KG-S1-KSE-S3 关键 export 可见性保持稳定 [ADDED]

- **假设** Context Engine 与其他模块依赖 KG 的类型常量和规则注入能力
- **当** 完成 `types.ts` 提取与服务拆分
- **则** `KnowledgeEntityType`、`KNOWLEDGE_ENTITY_TYPES`、`AiContextLevel`、`AI_CONTEXT_LEVELS` 等关键导出保持可见
- **并且** `buildRulesInjection` 保持稳定可导入路径，不得因拆分导致下游编译或运行断链
- **并且** 导出路径变更若不可避免，必须在同一 change 内完成全量消费方迁移与回归验证

## Out of Scope

- 新增实体/关系业务功能、调整 AI 上下文策略或修改 IPC 通道语义。
- 修改 SQLite 表结构、迁移策略或错误码字典。
- 处理 Sprint 2 范围内的 KG 功能增强需求。
