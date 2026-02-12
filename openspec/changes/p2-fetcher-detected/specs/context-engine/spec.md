# Context Engine Specification Delta

## Change: p2-fetcher-detected

### Requirement: REQ-CE-RETRIEVED-CODEX-DETECTED Retrieved 层 Codex 引用检测注入 [ADDED]

Context Engine 的 retrieved fetcher **必须**执行 Codex 引用检测：

1. 从 `ContextAssembleRequest.additionalInput` 获取光标前后文本
2. 调用 `kgService.entityList({ projectId, filter: { aiContextLevel: "when_detected" } })` 获取所有可检测实体
3. 将实体映射为 `MatchableEntity[]`（`id/name/aliases/aiContextLevel`）
4. 调用 `matchEntities(text, matchableEntities)` 执行匹配
5. 对每个匹配到的实体，查询完整详情并用 `formatEntityForContext` 格式化为 chunk

注入格式（与 rules fetcher 一致，复用 `formatEntityForContext`）：

```
[知识图谱 — 引用检测]
## 角色：林小雨
- 类型：character
- 描述：林默的妹妹
```

每个 chunk 的 `source` 字段格式为 `"codex:detected:<entityId>"`。

当文本为空（`additionalInput` 为 `undefined` 或 `""`）时，跳过引用检测，返回空 chunks。

当 KG 查询失败时，返回空 chunks + warning `"KG_UNAVAILABLE: 知识图谱数据未注入"`。

当匹配引擎失败时（`matchEntities` 抛出运行时异常），返回空 chunks + warning `"ENTITY_MATCH_FAILED: 实体匹配异常"`。

此 fetcher 不处理 `always` 实体（由 rules fetcher 处理）。
此 fetcher 不处理 `never/manual_only` 实体（不注入）。

#### Scenario: S1 检测到引用并注入实体详情 [ADDED]

- **假设** 实体「林小雨」`aiContextLevel="when_detected"`，`aliases=["小雨"]`；实体「魔法系统」`aiContextLevel="always"`（不在 retrieved 处理范围）
- **并且** `additionalInput = "小雨推开门走了进来"`
- **当** retrieved fetcher 执行组装（mock `kgService.entityList` 返回含「林小雨」的实体列表，mock `matchEntities` 返回 `[{ entityId: "e1", matchedTerm: "小雨", position: 0 }]`）
- **则** 返回 chunks 包含「林小雨」的详情
- **并且** 不包含「魔法系统」（由 rules 层处理）
- **并且** `chunks[0].source === "codex:detected:<林小雨的ID>"`

#### Scenario: S2 无匹配时返回空 [ADDED]

- **假设** mock `matchEntities` 返回 `[]`（文本中无实体引用）
- **并且** `additionalInput = "天气很好，阳光明媚"`
- **当** retrieved fetcher 执行组装
- **则** 返回 `{ chunks: [] }`

#### Scenario: S3 additionalInput 为空时跳过检测 [ADDED]

- **假设** 多个 `when_detected` 实体存在
- **并且** `additionalInput` 为 `undefined` 或 `""`
- **当** retrieved fetcher 执行组装
- **则** 返回 `{ chunks: [] }`
- **并且** `matchEntities` 未被调用

#### Scenario: S4 KG 查询失败降级 [ADDED]

- **假设** mock `kgService.entityList` 抛出异常 `new Error("DB error")`
- **当** retrieved fetcher 执行组装
- **则** 返回 `{ chunks: [], warnings: ["KG_UNAVAILABLE: 知识图谱数据未注入"] }`

#### Scenario: S5 matchEntities 异常降级 [ADDED]

- **假设** mock `matchEntities` 抛出运行时异常 `new Error("pattern compile failed")`
- **当** retrieved fetcher 执行组装
- **则** 返回 `{ chunks: [], warnings: ["ENTITY_MATCH_FAILED: 实体匹配异常"] }`
- **并且** 不抛出异常到上层
