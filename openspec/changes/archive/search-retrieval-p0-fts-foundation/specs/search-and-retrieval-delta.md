# Search & Retrieval Specification Delta

## Change: search-retrieval-p0-fts-foundation

### Requirement: 全文检索（FTS） [MODIFIED]

SR-1 固化 FTS 基础能力，作为后续语义检索与 RAG 的前置底座。

FTS5 基线：

- 索引对象：TipTap JSON 转纯文本后的文档内容。
- 索引范围：同一 `projectId` 内所有文档。
- 更新策略：autosave 触发后异步增量更新，编辑线程不可阻塞。
- 重建策略：索引损坏时允许手动/自动触发 `search:fts:reindex`。

IPC 契约（Schema-First + Request-Response）：

| IPC 通道             | 请求 Schema（Zod）        | 响应 Schema（Zod）         | 说明                 |
| -------------------- | ------------------------- | -------------------------- | -------------------- |
| `search:fts:query`   | `SearchFtsQueryRequest`   | `SearchFtsQueryResponse`   | 关键词检索与分页查询 |
| `search:fts:reindex` | `SearchFtsReindexRequest` | `SearchFtsReindexResponse` | FTS 索引重建         |

`search:fts:query` 响应数据结构（`ok=true`）：

| 字段         | 类型                      | 说明           |
| ------------ | ------------------------- | -------------- |
| `results`    | `FTSResult[]`             | 命中结果列表   |
| `total`      | `number`                  | 命中总数       |
| `hasMore`    | `boolean`                 | 是否可继续分页 |
| `indexState` | `"ready" \| "rebuilding"` | 索引状态       |

`FTSResult` 最小结构：

- `projectId`
- `documentId`
- `documentTitle`
- `documentType`
- `snippet`
- `highlights`（关键词命中区间数组）
- `anchor`（编辑器跳转定位信息）
- `score`
- `updatedAt`

搜索交互与可见反馈：

- 点击结果必须加载目标文档并滚动到 `anchor`。
- 定位后关键词触发短暂高亮闪烁，便于视觉定位。
- 空结果时展示「未找到匹配结果」与改写建议。
- 索引重建中返回可见状态，提示用户稍后重试。

搜索面板 Storybook（强制）：

- `SearchPanel/WithResults`
- `SearchPanel/Empty`
- `SearchPanel/Loading`

#### Scenario: SR1-R1-S1 用户在搜索面板执行关键词检索 [MODIFIED]

- **假设** 项目中存在多个章节文档且已建立 FTS 索引
- **当** 用户按 `Cmd/Ctrl+Shift+F` 输入关键词
- **则** 系统通过 `search:fts:query` 返回命中片段与高亮区间
- **并且** 结果按相关度排序

#### Scenario: SR1-R1-S2 用户点击结果后跳转定位 [MODIFIED]

- **假设** 搜索结果中存在目标命中项
- **当** 用户点击该结果
- **则** 编辑器加载对应文档并滚动到 `anchor`
- **并且** 命中关键词触发短暂高亮闪烁

#### Scenario: SR1-R1-S3 搜索无结果时显示可操作空态 [MODIFIED]

- **假设** 查询词在当前项目不存在
- **当** `search:fts:query` 返回空集合
- **则** 面板展示无结果提示与关键词改写建议
- **并且** UI 保持可继续输入状态

#### Scenario: SR1-R1-S4 索引异常触发重建并提示 [MODIFIED]

- **假设** FTS 索引损坏或不可读
- **当** 用户发起搜索
- **则** 系统触发 `search:fts:reindex`
- **并且** 返回 `indexState="rebuilding"` 与可见提示
- **并且** 重建完成后查询恢复正常

## Out of Scope

- 语义搜索、向量嵌入与 RAG 注入。
- 搜索替换。
- 两阶段混合重排与 explain。
