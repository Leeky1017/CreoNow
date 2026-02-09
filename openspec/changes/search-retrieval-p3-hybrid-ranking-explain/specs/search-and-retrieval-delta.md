# Search & Retrieval Specification Delta

## Change: search-retrieval-p3-hybrid-ranking-explain

### Requirement: 检索算法与排序策略 [MODIFIED]

SR-4 固化两阶段召回与可解释重排契约。

两阶段召回：

1. FTS 召回：`search:fts:query` Top200
2. 语义召回：`embedding:search` Top200
3. 去重：按 `documentId + chunkId`
4. 融合重排：

```text
finalScore = 0.55 * bm25Norm + 0.35 * semanticScore + 0.10 * recencyScore
```

5. 截断：首屏返回 Top50，后续分页增量加载

排序约束：

- `finalScore` 降序。
- 同分按 `updatedAt` 降序。
- `finalScore < 0.25` 默认隐藏。

结果结构（最小）：

- `documentId`
- `chunkId`
- `snippet`
- `finalScore`
- `scoreBreakdown`（`bm25/semantic/recency`）
- `updatedAt`

新增 IPC 契约：

| IPC 通道                | 请求 Schema（Zod）           | 响应 Schema（Zod）            | 说明                            |
| ----------------------- | ---------------------------- | ----------------------------- | ------------------------------- |
| `search:rank:explain`   | `SearchRankExplainRequest`   | `SearchRankExplainResponse`   | 返回排序拆解                    |
| `search:query:strategy` | `SearchQueryStrategyRequest` | `SearchQueryStrategyResponse` | 指定 `fts/semantic/hybrid` 策略 |

分页策略：

- 首屏固定 Top50。
- `hasMore=true` 时按每页 50 条增量加载。
- 单次候选上限 10,000，超限强制截断并记录背压信息。

#### Scenario: SR4-R1-S1 Hybrid 返回可解释排序结果 [MODIFIED]

- **假设** 用户使用 hybrid 模式执行检索
- **当** 系统完成双通道召回与融合重排
- **则** 返回按 `finalScore` 降序的 Top50
- **并且** 每条结果包含 `scoreBreakdown`
- **并且** 用户可通过 `search:rank:explain` 查看排序依据

#### Scenario: SR4-R1-S2 大结果集触发分页与同分规则 [MODIFIED]

- **假设** 检索候选结果远超首屏容量
- **当** 系统完成去重与排序
- **则** 首次返回 Top50 且 `hasMore=true`
- **并且** 后续按页增量加载
- **并且** 同分结果按 `updatedAt` 降序稳定输出

## Out of Scope

- 权重公式与阈值参数调整。
- 第三种检索策略接入。
- 搜索替换与版本快照链路变更。
