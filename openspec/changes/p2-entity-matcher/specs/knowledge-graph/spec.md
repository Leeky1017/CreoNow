# Knowledge Graph Specification Delta

## Change: p2-entity-matcher

### Requirement: REQ-KG-ENTITY-MATCHER 实体名/别名文本匹配引擎 [ADDED]

知识图谱**必须**提供实体名/别名文本匹配引擎，作为纯函数导出。

函数签名：

```typescript
type MatchableEntity = {
  id: string;
  name: string;
  aliases: string[];
  aiContextLevel: AiContextLevel;
};

type MatchResult = {
  entityId: string;
  matchedTerm: string; // 匹配到的名称或别名
  position: number; // 在文本中的起始位置（text.indexOf）
};

function matchEntities(
  text: string,
  entities: MatchableEntity[],
): MatchResult[];
```

匹配规则：

- 只匹配 `aiContextLevel` 为 `"when_detected"` 的实体
- 匹配实体的 `name` 和 `aliases` 中的所有项
- 匹配为子字符串包含（case-sensitive，因为中文无大小写）
- 同一实体如果 `name` 和 `alias` 都匹配，只返回一次（去重按 `entityId`）
- 去重时保留第一个匹配的 term（优先 `name`，再按 `aliases` 顺序）
- 空文本返回空数组
- 空实体列表返回空数组

#### Scenario: S1 匹配实体名称 [ADDED]

- **假设** `text = "林默推开门，走进长安城"`，`entities` 包含 `{ id: "e1", name: "林默", aliases: [], aiContextLevel: "when_detected" }` 和 `{ id: "e2", name: "长安城", aliases: ["长安"], aiContextLevel: "when_detected" }`
- **当** 调用 `matchEntities(text, entities)`
- **则** 返回 2 个结果
- **并且** 包含 `{ entityId: "e1", matchedTerm: "林默" }` 和 `{ entityId: "e2", matchedTerm: "长安城" }`

#### Scenario: S2 通过别名匹配 [ADDED]

- **假设** `text = "小默推开门"`，`entities` 包含 `{ id: "e1", name: "林默", aliases: ["小默", "默哥"], aiContextLevel: "when_detected" }`
- **当** 调用 `matchEntities(text, entities)`
- **则** 返回 1 个结果
- **并且** `result[0].entityId === "e1"` 且 `result[0].matchedTerm === "小默"`

#### Scenario: S3 always/never/manual_only 实体不参与匹配 [ADDED]

- **假设** `text = "林默和张薇在讨论"`，`entities` 包含 `{ id: "e1", name: "林默", aiContextLevel: "always" }`、`{ id: "e2", name: "张薇", aiContextLevel: "never" }`、`{ id: "e3", name: "讨论", aiContextLevel: "manual_only" }`
- **当** 调用 `matchEntities(text, entities)`
- **则** 返回空数组（无 `when_detected` 实体参与匹配）

#### Scenario: S4 同一实体 name + alias 都匹配时去重 [ADDED]

- **假设** `text = "林默和小默一起出发"`，`entities` 包含 `{ id: "e1", name: "林默", aliases: ["小默"], aiContextLevel: "when_detected" }`
- **当** 调用 `matchEntities(text, entities)`
- **则** 返回 1 个结果（按 `entityId` 去重）
- **并且** `result[0].entityId === "e1"` 且 `result[0].matchedTerm === "林默"`（name 优先）

#### Scenario: S5 空文本返回空数组 [ADDED]

- **假设** `text = ""`，`entities` 包含 `{ id: "e1", name: "林默", aliases: [], aiContextLevel: "when_detected" }`
- **当** 调用 `matchEntities(text, entities)`
- **则** 返回 `[]`

#### Scenario: S6 性能——100 实体 × 1000 字 < 10ms [ADDED]

- **假设** 100 个实体（每个有 2 个 aliases，共 300 个匹配候选词）
- **并且** `text` 为 1000 个中文字符
- **当** 调用 `matchEntities(text, entities)` 并计时
- **则** 执行时间 < 10ms
