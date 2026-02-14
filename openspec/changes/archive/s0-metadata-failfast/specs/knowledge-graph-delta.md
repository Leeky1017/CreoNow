# Knowledge Graph Specification Delta

## Change: s0-metadata-failfast

### Requirement: KG Panel metadata 写入必须 fail-fast 防止数据丢失 [MODIFIED]

当系统从 `metadataJson` 解析 metadata 并进行增量写入（例如写入 `ui.position`、`timeline.order`）时，解析失败不得以默认空对象继续写入，从而覆盖用户已有 metadata。

#### Scenario: KG-S0-MFF-S1 kgToGraph 在 metadataJson 非法时保留原字符串 [ADDED]

- **假设** `currentMetadataJson` 为非法 JSON（例如 `"{{invalid"`）
- **当** `kgToGraph` 尝试解析并准备写入位置/顺序字段
- **则** `kgToGraph` 必须直接返回原始 `currentMetadataJson`（不覆盖、不回写）
- **并且** 必须记录可观测日志/告警（至少含固定前缀与截断后的 metadata 片段）

#### Scenario: KG-S0-MFF-S2 KnowledgeGraphPanel parseMetadataJson 非法时返回 null，调用方必须停止写入 [ADDED]

- **假设** `metadataJson` 为非法 JSON（例如 `"not-json"`）
- **当** `KnowledgeGraphPanel` 调用 `parseMetadataJson(metadataJson)`
- **则** 返回值必须为 `null`（而不是 `{}`）
- **并且** 任意依赖 metadata 的后续写入（`ui.position`、`timeline.order`、视图偏好保存等）必须 fail-fast 中止

## Out of Scope

- 对历史已损坏/被覆盖的 metadata 的修复与迁移。
- 全局错误提示样式/文案系统化改造。
