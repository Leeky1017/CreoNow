# Knowledge Graph Specification Delta

## Change: s3-kg-last-seen

### Requirement: 实体管理必须支持 `lastSeenState` 字段并保持历史兼容 [MODIFIED]

知识图谱实体在既有字段基础上，必须新增可选字段 `lastSeenState`；该字段在 TypeScript 层与数据库层必须使用稳定映射 `lastSeenState` ↔ `last_seen_state`，并保持历史数据兼容。

#### Scenario: S3-KGLS-S1 更新实体时写入 `lastSeenState` 并可读回 [ADDED]

- **假设** 项目中已存在角色实体 `character-1`
- **当** 用户通过实体更新流程提交 `lastSeenState: "受伤但清醒"`
- **则** 主进程必须将该值持久化到 `kg_entities.last_seen_state`
- **并且** 后续读取实体详情时返回 `lastSeenState: "受伤但清醒"`

#### Scenario: S3-KGLS-S2 历史实体无 `lastSeenState` 时保持兼容 [ADDED]

- **假设** migration 前创建的历史实体 `character-legacy` 其 `last_seen_state` 为空
- **当** 系统读取或更新该实体的其他字段
- **则** 实体读取与更新流程必须正常完成，不得抛出字段缺失错误
- **并且** UI 对该字段展示为空态，不影响其他属性编辑

## Out of Scope

- 章节完成后的自动状态提取流程（由 `s3-state-extraction` 负责）
- 摘要生成与上下文注入链路（由 Sprint 3 其他 change 负责）
- 知识图谱关系模型和实体类型扩展
