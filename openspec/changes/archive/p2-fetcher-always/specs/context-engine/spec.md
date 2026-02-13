# Context Engine Specification Delta

## Change: p2-fetcher-always

### Requirement: REQ-CE-RULES-KG-ALWAYS Rules 层知识图谱 Always 实体注入 [ADDED]

Context Engine 的 rules fetcher **必须**查询知识图谱中 `aiContextLevel="always"` 的实体，格式化为结构化文本注入 Rules 层。

查询方式：调用 `kgService.entityList({ projectId, filter: { aiContextLevel: "always" } })`

注入格式：

```
[知识图谱 — 始终注入]
## 角色：林默
- 类型：character
- 描述：28岁侦探，性格冷静
- 属性：年龄=28, 职业=侦探

## 地点：长安城
- 类型：location
- 描述：故事主要发生地
```

每个实体一个 `##` 段落，包含 `type`/`description`/`attributes`。

每个 chunk 的 `source` 字段格式为 `"kg:always:<entityId>"`。

当 KG 查询失败时（`ok: false` 或抛出异常），rules fetcher 返回空 chunks + warning `"KG_UNAVAILABLE: 知识图谱数据未注入"`，不中断组装。

当无 always 实体时，rules fetcher 返回空 chunks（正常情况，非错误）。

`formatEntityForContext(entity)` 辅助函数**必须**作为独立导出函数，供 C12 retrieved fetcher 复用。

实体类型中文映射：`character → "角色"`、`location → "地点"`、`event → "事件"`、`item → "物品"`、`faction → "阵营"`。

#### Scenario: S1 注入 always 实体到 rules 层 [ADDED]

- **假设** 项目中有 2 个 `always` 实体：`{ name: "林默", type: "character", description: "28岁侦探", attributes: { age: "28" } }` 和 `{ name: "魔法系统", type: "item", description: "本世界的超能力体系", attributes: {} }`
- **当** rules fetcher 执行组装（mock `kgService.entityList` 返回上述 2 个实体）
- **则** 返回的 chunks 中包含 `"林默"` 和 `"魔法系统"` 的详情
- **并且** `chunks[0].source === "kg:always:<林默的ID>"`
- **并且** `chunks[0].content` 包含 `"28岁侦探"`
- **并且** `chunks[1].content` 包含 `"魔法系统"`

#### Scenario: S2 无 always 实体时返回空 [ADDED]

- **假设** mock `kgService.entityList` 返回 `{ ok: true, data: { items: [] } }`（项目中所有实体 `aiContextLevel` 均为 `"when_detected"` 或 `"never"`）
- **当** rules fetcher 执行组装
- **则** 返回 `{ chunks: [] }`
- **并且** 无 warning

#### Scenario: S3 KG 查询失败时降级 [ADDED]

- **假设** mock `kgService.entityList` 抛出异常 `new Error("DB connection lost")`
- **当** rules fetcher 执行组装
- **则** 返回 `{ chunks: [], warnings: ["KG_UNAVAILABLE: 知识图谱数据未注入"] }`
- **并且** 不抛出异常，组装继续

#### Scenario: S4 格式化输出包含完整结构 [ADDED]

- **假设** mock `kgService.entityList` 返回 always 实体 `{ name: "林默", type: "character", description: "侦探", attributes: { age: "28", skill: "推理" } }`
- **当** rules fetcher 格式化该实体
- **则** 输出包含 `"## 角色：林默"`
- **并且** 输出包含 `"类型：character"`
- **并且** 输出包含 `"描述：侦探"`
- **并且** 输出包含 `"age=28"`
- **并且** 输出包含 `"skill=推理"`
