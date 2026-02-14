# Rulebook Delta: issue-528-s0-metadata-failfast

## Requirement: KG metadata 写入链路 fail-fast

当 `metadataJson` 解析失败时，系统不得以默认对象继续写入 `ui.position` / `timeline.order`，必须保留原始 metadata 字符串并中止 metadata 写入。

#### Scenario: invalid metadata 不覆盖原值

- Given 实体 `metadataJson` 为非法 JSON、空字符串或合法但非对象 JSON
- When KG 面板触发 metadata 增量写入（位置或时间线排序）
- Then 返回值保持原始 `metadataJson`，不写回覆盖
- And 记录带固定前缀的告警日志，日志携带截断后的 metadata 片段

#### Scenario: parse helper 返回 null 并阻断写入

- Given `KnowledgeGraphPanel` 收到非法 `metadataJson`
- When 调用 parse helper
- Then 返回 `null`
- And 调用方停止 `entityUpdate` metadata 写入链路
