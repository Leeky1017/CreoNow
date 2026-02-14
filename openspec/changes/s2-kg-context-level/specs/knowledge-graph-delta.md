# Knowledge Graph Specification Delta

## Change: s2-kg-context-level

### Requirement: 实体上下文级别字段必须可持久化并可编辑 [ADDED]

系统必须为 KG 实体提供 `aiContextLevel` 字段，并确保该字段在迁移、创建、更新、读取与 UI 编辑流程中行为一致。

#### Scenario: KG-S2-CL-S1 新实体默认上下文级别可验证 [ADDED]

- **假设** 项目已完成新增列 migration，且创建实体请求未显式提供 `aiContextLevel`
- **当** 调用实体创建并读取该实体
- **则** 返回值中的 `aiContextLevel` 为 `when_detected`
- **并且** 默认值与数据库迁移默认值保持一致

#### Scenario: KG-S2-CL-S2 更新与过滤路径可验证 [ADDED]

- **假设** 实体已有 `aiContextLevel` 字段且支持编辑
- **当** 用户在编辑表单修改级别并保存
- **则** 后端更新后的实体返回新级别值
- **并且** 查询路径可按该级别进行筛选验证
