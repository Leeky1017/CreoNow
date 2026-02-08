# Knowledge Graph Specification Delta

## Change: knowledge-graph-p0-entity-relation-query

### Requirement: 实体管理 [MODIFIED]

KG-1 必须先建立实体数据模型、IPC 契约与运行时校验，作为 KG 后续能力基线。

实体表（SQLite）基线：

- `kg_entities(id TEXT PRIMARY KEY, project_id TEXT, type TEXT, name TEXT, description TEXT, attributes_json TEXT, version INTEGER, created_at TEXT, updated_at TEXT)`
- 索引：`idx_kg_entities_project(project_id)`、`idx_kg_entities_project_type(project_id, type)`、`idx_kg_entities_project_name(project_id, name)`
- 约束：
  - `type` 仅允许 `character|location|event|item|faction`
  - 单实体属性键数量上限 200
  - 单项目节点上限 50,000

实体类型与节点颜色 Token（与 `DESIGN_DECISIONS.md` 对齐）：

| 类型 ID     | 节点颜色 Token           |
| ----------- | ------------------------ |
| `character` | `--color-node-character` |
| `location`  | `--color-node-location`  |
| `event`     | `--color-node-event`     |
| `item`      | `--color-node-item`      |
| `faction`   | `--color-node-other`     |

实体 IPC + Zod 契约：

| IPC 通道                  | 请求 Schema（Zod）                   | 响应 Schema（Zod）                    |
| ------------------------- | ------------------------------------ | ------------------------------------- |
| `knowledge:entity:create` | `KnowledgeEntityCreateRequestSchema` | `KnowledgeEntityCreateResponseSchema` |
| `knowledge:entity:read`   | `KnowledgeEntityReadRequestSchema`   | `KnowledgeEntityReadResponseSchema`   |
| `knowledge:entity:update` | `KnowledgeEntityUpdateRequestSchema` | `KnowledgeEntityUpdateResponseSchema` |
| `knowledge:entity:delete` | `KnowledgeEntityDeleteRequestSchema` | `KnowledgeEntityDeleteResponseSchema` |
| `knowledge:entity:list`   | `KnowledgeEntityListRequestSchema`   | `KnowledgeEntityListResponseSchema`   |

实体详情页契约：

- 背景使用 `--color-bg-surface`。
- 输入框遵循 `DESIGN_DECISIONS.md` §6.2（40px 高度、边框与 focus ring 规范）。
- Storybook 必须覆盖 `default`、`empty`、`error` 三态。

#### Scenario: KG1-R1-S1 用户手动创建角色实体 [MODIFIED]

- **假设** 用户打开知识图谱面板并点击「添加节点」
- **当** 用户选择 `character` 并输入名称「林远」
- **则** 系统调用 `knowledge:entity:create`，经 Zod 校验后写入 `kg_entities`
- **并且** 新节点以 `--color-node-character` 颜色渲染
- **并且** 自动打开实体详情页供继续编辑

#### Scenario: KG1-R1-S2 用户编辑实体属性 [MODIFIED]

- **假设** 实体详情页已打开且当前实体存在
- **当** 用户更新描述并新增属性（如 `年龄: 28`）
- **则** 系统调用 `knowledge:entity:update` 并持久化 `attributes_json`
- **并且** 当属性键数量超过 200 时返回 `KG_ATTRIBUTE_KEYS_EXCEEDED`
- **并且** 关系图 Tooltip 信息同步刷新

#### Scenario: KG1-R1-S3 删除实体时级联处理关联关系 [MODIFIED]

- **假设** 目标实体存在 3 条入/出关系
- **当** 用户确认删除实体
- **则** 系统调用 `knowledge:entity:delete` 并在同事务内删除关联边
- **并且** 返回删除的边数量用于确认提示
- **并且** 图中节点与连线同步移除

### Requirement: 关系管理 [MODIFIED]

KG-1 必须固化关系数据结构、预置关系类型与自定义扩展机制。

关系表（SQLite）基线：

- `kg_relations(id TEXT PRIMARY KEY, project_id TEXT, source_entity_id TEXT, target_entity_id TEXT, relation_type TEXT, description TEXT, created_at TEXT)`
- `kg_relation_types(id TEXT PRIMARY KEY, project_id TEXT, key TEXT, label TEXT, builtin INTEGER, created_at TEXT)`
- 索引：`idx_kg_relations_project(project_id)`、`idx_kg_relations_source(project_id, source_entity_id)`、`idx_kg_relations_target(project_id, target_entity_id)`
- 约束：
  - 单项目边上限 200,000
  - `source_entity_id != target_entity_id`（自环需走显式校验策略）

预置关系类型（8 种）：

- `ally`
- `enemy`
- `parent`
- `sibling`
- `belongs_to`
- `owns`
- `located_at`
- `participates_in`

关系 IPC + Zod 契约：

| IPC 通道                    | 请求 Schema（Zod）                     | 响应 Schema（Zod）                      |
| --------------------------- | -------------------------------------- | --------------------------------------- |
| `knowledge:relation:create` | `KnowledgeRelationCreateRequestSchema` | `KnowledgeRelationCreateResponseSchema` |
| `knowledge:relation:update` | `KnowledgeRelationUpdateRequestSchema` | `KnowledgeRelationUpdateResponseSchema` |
| `knowledge:relation:delete` | `KnowledgeRelationDeleteRequestSchema` | `KnowledgeRelationDeleteResponseSchema` |
| `knowledge:relation:list`   | `KnowledgeRelationListRequestSchema`   | `KnowledgeRelationListResponseSchema`   |

#### Scenario: KG1-R2-S1 用户拖拽创建预置关系 [MODIFIED]

- **假设** 关系图中存在源节点与目标节点
- **当** 用户拖拽连线并选择预置类型 `ally`
- **则** 系统调用 `knowledge:relation:create` 并创建边记录
- **并且** 连线标签显示「盟友」
- **并且** 边颜色使用 `--color-fg-subtle`

#### Scenario: KG1-R2-S2 用户创建自定义关系类型并复用 [MODIFIED]

- **假设** 预置关系类型无法满足表达需求
- **当** 用户输入自定义关系类型「师徒」并确认创建关系
- **则** 系统在 `kg_relation_types` 中登记该类型（`builtin=0`）
- **并且** 关系创建成功并可在后续关系创建中复用

#### Scenario: KG1-R2-S3 用户删除关系 [MODIFIED]

- **假设** 两实体之间存在关系边
- **当** 用户执行删除关系操作
- **则** 系统调用 `knowledge:relation:delete` 删除目标边
- **并且** 图中仅移除该边，实体节点保持不变

### Requirement: 查询契约、循环关系检测与降级检索 [MODIFIED]

KG-1 必须定义可验证查询 IPC 契约，并固定查询边界。

查询 IPC + Zod 契约：

| IPC 通道                   | 请求 Schema（Zod）                    | 响应 Schema（Zod）                     |
| -------------------------- | ------------------------------------- | -------------------------------------- |
| `knowledge:query:subgraph` | `KnowledgeQuerySubgraphRequestSchema` | `KnowledgeQuerySubgraphResponseSchema` |
| `knowledge:query:path`     | `KnowledgeQueryPathRequestSchema`     | `KnowledgeQueryPathResponseSchema`     |
| `knowledge:query:validate` | `KnowledgeQueryValidateRequestSchema` | `KnowledgeQueryValidateResponseSchema` |

边界与降级策略：

- `subgraph` 最大 `k=3`。
- `path` 搜索最大扩展节点数 10,000。
- `validate` 必须返回 `cycles` 列表，不得因为循环而中断查询。
- 任一查询耗时超过 2s，返回 `KG_QUERY_TIMEOUT`，并附带关键词过滤建议。

#### Scenario: KG1-R3-S1 子图查询返回可用上下文 [MODIFIED]

- **假设** 用户请求中心实体的 2-hop 子图
- **当** 调用 `knowledge:query:subgraph`
- **则** 返回 2 跳范围内实体与关系
- **并且** 响应包含 `nodeCount`、`edgeCount`、`queryCostMs`
- **并且** 当请求 `k>3` 时返回 `KG_SUBGRAPH_K_EXCEEDED`

#### Scenario: KG1-R3-S2 循环检测与超时降级 [MODIFIED]

- **假设** 图中存在循环关系且当前查询负载较高
- **当** 调用 `knowledge:query:validate` 与 `knowledge:query:path`
- **则** `validate` 返回 `cycles`（如 `A->B->C->A`）且不中断查询
- **并且** `path` 超过 2s 时返回 `KG_QUERY_TIMEOUT`
- **并且** 编辑器主流程保持可用

### Requirement: 模块级可验收标准（KG-1 适用子集） [MODIFIED]

KG-1 覆盖范围必须满足：

- 实体 CRUD p95 < 220ms
- 子图查询 p95 < 300ms
- 相关实体检索（后续 `knowledge:query:relevant` 基线）p95 < 250ms
- IPC 入口统一执行 Zod 校验并返回可判定结果

#### Scenario: KG1-A-S1 KG-1 数据层性能达到基线 [MODIFIED]

- **假设** 单项目规模达到 50,000 节点、120,000 边
- **当** 执行批量 CRUD 与查询基线测试
- **则** 关键指标满足 KG 主 spec 阈值
- **并且** 无未定义错误码返回

### Requirement: 异常与边界覆盖矩阵（KG-1 相关） [MODIFIED]

KG-1 必须覆盖以下跨切场景：

- 数据异常：重复实体、非法关系、循环引用
- 并发冲突：并发更新同一实体
- 容量溢出：节点/边超上限

#### Scenario: KG1-X-S1 重复实体创建被阻断 [MODIFIED]

- **假设** 项目中已存在同类型同名实体
- **当** 用户再次创建同名实体
- **则** 返回 `KG_ENTITY_DUPLICATE`
- **并且** 不写入数据库

#### Scenario: KG1-X-S2 非法关系写入被拒绝 [MODIFIED]

- **假设** 关系请求引用不存在实体或跨项目实体
- **当** 系统处理 `knowledge:relation:create`
- **则** 返回 `KG_RELATION_INVALID`
- **并且** 记录结构化错误日志

#### Scenario: KG1-X-S3 并发更新同一实体触发版本冲突 [MODIFIED]

- **假设** 两个窗口持有同一实体的不同版本
- **当** 落后版本提交 `knowledge:entity:update`
- **则** 返回 `KG_ENTITY_CONFLICT`
- **并且** 响应包含 `latestSnapshot`

#### Scenario: KG1-X-S4 节点或边容量超限触发保护 [MODIFIED]

- **假设** 项目节点达到 50,000 或边达到 200,000
- **当** 用户继续创建实体或关系
- **则** 返回 `KG_CAPACITY_EXCEEDED`
- **并且** 提示用户归并重复实体或清理冗余关系

## Out of Scope

- 可视化关系图 Force-directed 渲染实现。
- 时间线与角色卡扩展视图实现。
- 自动识别建议与 AI 续写注入实现。
