# Search & Retrieval Specification Delta

## Change: search-retrieval-p1-embedding-semantic-rag

### Requirement: 向量嵌入与语义搜索 [MODIFIED]

SR-2 固化语义检索数据与契约，确保在模型异常时可降级到 FTS。

chunk 数据结构（最小字段）：

- `id`
- `documentId`
- `projectId`
- `text`
- `embedding`
- `startOffset`
- `endOffset`
- `updatedAt`

增量更新策略：

- autosave 后识别段落级差异。
- 仅重建变更段落 embedding；未变更段落保持不动。
- 生成任务在后台异步执行，不阻塞编辑器输入。

`embedding:*` IPC 契约：

| IPC 通道             | 请求 Schema（Zod）         | 响应 Schema（Zod）          | 默认参数                   |
| -------------------- | -------------------------- | --------------------------- | -------------------------- |
| `embedding:generate` | `EmbeddingGenerateRequest` | `EmbeddingGenerateResponse` | `model=default`            |
| `embedding:search`   | `EmbeddingSearchRequest`   | `EmbeddingSearchResponse`   | `topK=20`, `minScore=0.55` |
| `embedding:reindex`  | `EmbeddingReindexRequest`  | `EmbeddingReindexResponse`  | `batchSize=128`            |

语义不可用回退规则：

- 当本地模型加载失败或 API 不可达时，`embedding:search` 返回可判定降级状态。
- 系统自动回退到 `search:fts:query`，并向 UI 暴露可见提示。

#### Scenario: SR2-R1-S1 语义搜索返回相似段落 [MODIFIED]

- **假设** 项目已存在按段落生成的 embedding 索引
- **当** 用户在语义模式输入查询文本
- **则** 系统通过 `embedding:search` 返回按相似度排序的段落
- **并且** 即使不含相同关键词也能命中语义近邻内容

#### Scenario: SR2-R1-S2 嵌入服务不可用时回退 FTS [MODIFIED]

- **假设** 嵌入模型不可用
- **当** 用户发起语义搜索
- **则** 系统回退 `search:fts:query`
- **并且** 返回可见提示「语义搜索暂时不可用，已切换为关键词搜索」

#### Scenario: SR2-R1-S3 文档改动触发增量嵌入更新 [MODIFIED]

- **假设** 用户仅修改文档中的部分段落
- **当** autosave 触发嵌入更新
- **则** 仅变更段落被重新嵌入
- **并且** 更新过程不阻塞编辑器交互

### Requirement: RAG 检索增强生成 [MODIFIED]

SR-2 固化 RAG 召回与 Retrieved 注入契约，避免 AI 调用链条出现不透明行为。

`rag:*` IPC 契约：

| IPC 通道            | 请求 Schema（Zod）       | 响应 Schema（Zod）        | 默认参数                 |
| ------------------- | ------------------------ | ------------------------- | ------------------------ |
| `rag:retrieve`      | `RagRetrieveRequest`     | `RagRetrieveResponse`     | `topK=5`, `minScore=0.7` |
| `rag:config:get`    | `RagConfigGetRequest`    | `RagConfigGetResponse`    | 返回当前默认值           |
| `rag:config:update` | `RagConfigUpdateRequest` | `RagConfigUpdateResponse` | 需通过 Zod 校验          |

Retrieved 注入契约：

- `rag:retrieve` 成功时返回 `chunks[]`（含 `chunkId/documentId/text/score/tokenEstimate`）。
- Context Engine 依据 Retrieved 层预算执行二次截断并标记 `truncated=true|false`。
- 当 `chunks` 为空时返回 `ok=true` 且 `chunks=[]`，不得抛异常阻断 AI。

#### Scenario: SR2-R2-S1 AI 调用时注入 Retrieved 上下文 [MODIFIED]

- **假设** 用户在编辑器触发 AI 续写
- **当** 系统执行 `rag:retrieve`
- **则** 返回相关 chunk 并注入 Context Engine Retrieved 层
- **并且** AI 输出与历史设定保持一致

#### Scenario: SR2-R2-S2 RAG 召回为空时不中断生成 [MODIFIED]

- **假设** 查询与项目内容无语义关联
- **当** `rag:retrieve` 未命中超过 `minScore` 的 chunk
- **则** 返回空召回集合
- **并且** AI 继续基于其他层上下文生成，不报错

#### Scenario: SR2-R2-S3 RAG 超预算时按分数截断 [MODIFIED]

- **假设** 召回内容 token 总量超过 Retrieved 层预算
- **当** Context Engine 执行预算裁剪
- **则** 按相似度降序保留高分 chunk 至预算上限
- **并且** 返回 `truncated=true` 供调试与可观测性使用

## Out of Scope

- 搜索替换与版本快照联动。
- 混合重排公式与 explain 契约。
- 引入第三种检索算法。
