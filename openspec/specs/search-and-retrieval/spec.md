# Search & Retrieval Specification

## Purpose

全文检索（FTS）、RAG 检索增强生成、向量嵌入与语义搜索。为 AI 续写和用户搜索提供相关上下文片段。

### Scope

| Layer    | Path                                                                                  |
| -------- | ------------------------------------------------------------------------------------- |
| Backend  | `main/src/services/rag/`, `main/src/services/search/`, `main/src/services/embedding/` |
| IPC      | `main/src/ipc/rag.ts`, `main/src/ipc/search.ts`, `main/src/ipc/embedding.ts`          |
| Frontend | `renderer/src/features/search/`                                                       |
| Store    | `renderer/src/stores/searchStore.ts`                                                  |

## Requirements

### Requirement: 全文检索（FTS）

系统**必须**提供全文检索功能，允许用户在当前项目的所有文档中搜索关键词。

全文检索基于 SQLite FTS5 扩展实现，索引内容为文档的纯文本内容（TipTap JSON → plain text）。

索引更新策略：

- 文档保存时（autosave 触发后）异步更新对应文档的 FTS 索引
- 索引更新**不阻塞**编辑器操作

搜索入口：

- 命令面板（`Cmd/Ctrl+P`）中输入关键词搜索文件内容
- 专用搜索面板（`Cmd/Ctrl+Shift+F`）提供高级搜索

搜索结果展示：

- 每条结果显示：文档标题、匹配片段（高亮关键词）、文档类型图标
- 结果按相关度排序
- 点击结果跳转到对应文档的匹配位置

搜索的 IPC 通道：

| IPC 通道             | 通信模式         | 方向            | 用途          |
| -------------------- | ---------------- | --------------- | ------------- |
| `search:fts:query`   | Request-Response | Renderer → Main | 全文检索      |
| `search:fts:reindex` | Request-Response | Renderer → Main | 重建 FTS 索引 |

搜索面板组件**必须**有 Storybook Story，覆盖：有搜索结果态、无结果态、搜索中态。

#### Scenario: 用户搜索关键词

- **假设** 项目中有 10 个章节文档
- **当** 用户按下 `Cmd/Ctrl+Shift+F`，输入「林远」
- **则** 搜索面板展示所有包含「林远」的文档片段
- **并且** 关键词在片段中高亮显示
- **并且** 结果按相关度排序

#### Scenario: 用户点击搜索结果跳转

- **假设** 搜索结果显示「第三章」中有匹配
- **当** 用户点击该结果
- **则** 编辑器加载「第三章」并滚动到匹配位置
- **并且** 匹配关键词短暂高亮闪烁提示

#### Scenario: 搜索无结果

- **假设** 用户搜索一个项目中不存在的关键词
- **当** FTS 查询返回空结果
- **则** 搜索面板显示「未找到匹配结果」
- **并且** 建议检查拼写或使用不同关键词

#### Scenario: FTS 索引损坏时的降级

- **假设** FTS 索引文件损坏
- **当** 用户执行搜索
- **则** 系统检测到索引异常，自动触发重建（`search:fts:reindex`）
- **并且** 搜索面板显示「正在重建索引，请稍后重试」
- **并且** 重建完成后搜索功能恢复正常

---

### Requirement: 向量嵌入与语义搜索

系统**必须**为文档内容生成向量嵌入（Embedding），支持基于语义相似度的搜索。

嵌入策略：

- 文档按段落（paragraph）粒度切分为 chunk
- 每个 chunk 生成一个 embedding 向量
- chunk 数据结构：`id`、`documentId`、`projectId`、`text`（原文）、`embedding`（向量）、`startOffset`、`endOffset`、`updatedAt`
- 向量维度由所使用的嵌入模型决定（V1 阶段使用本地轻量模型或 API）

嵌入更新策略：

- 文档保存时，对变更的段落增量更新嵌入
- 批量更新在后台异步执行，不阻塞编辑器

语义搜索通过计算查询文本与 chunk 向量的余弦相似度排序返回结果。

嵌入与语义搜索的 IPC 通道：

| IPC 通道             | 通信模式         | 方向            | 用途               |
| -------------------- | ---------------- | --------------- | ------------------ |
| `embedding:generate` | Request-Response | Renderer → Main | 为文本生成嵌入向量 |
| `embedding:search`   | Request-Response | Renderer → Main | 语义搜索           |
| `embedding:reindex`  | Request-Response | Renderer → Main | 重建向量索引       |

#### Scenario: 语义搜索——查找相似内容

- **假设** 用户想找到项目中所有描写「孤独感」的段落
- **当** 用户在搜索面板切换到「语义搜索」模式，输入「角色内心的孤独与迷茫」
- **则** 系统通过 `embedding:search` 计算语义相似度
- **并且** 返回语义最接近的段落列表，即使它们不包含「孤独」这个词

#### Scenario: 嵌入模型不可用时的降级

- **假设** 嵌入模型服务不可用（本地模型加载失败或 API 不可达）
- **当** 用户尝试语义搜索
- **则** 系统自动回退到 FTS 全文检索
- **并且** 搜索面板提示「语义搜索暂时不可用，已切换为关键词搜索」

#### Scenario: 增量更新嵌入

- **假设** 用户编辑了「第五章」的第 3 段
- **当** 文档保存触发嵌入更新
- **则** 系统仅对变更的第 3 段重新生成嵌入
- **并且** 其他段落的嵌入保持不变
- **并且** 更新在后台完成，不阻塞编辑器

---

### Requirement: RAG 检索增强生成

系统**必须**支持 RAG（Retrieval-Augmented Generation）模式，为 AI 技能执行提供检索增强的上下文。

RAG 流程：

1. AI 技能触发时，系统根据当前编辑上下文生成检索查询
2. 通过语义搜索从项目文档中召回相关 chunk
3. 召回的 chunk 经过去重、排序和截断后注入 Context Engine 的 **Retrieved 层**
4. Context Engine 将 Retrieved 层与其他层（Rules、Settings、Immediate）组合后喂入 LLM

RAG 参数：

- `topK`：召回数量，默认 5，可配置
- `minScore`：最低相似度阈值，默认 0.7
- `maxTokens`：Retrieved 层最大 token 数，受 Context Engine 统一管理

RAG 的 IPC 通道：

| IPC 通道            | 通信模式         | 方向            | 用途                 |
| ------------------- | ---------------- | --------------- | -------------------- |
| `rag:retrieve`      | Request-Response | Renderer → Main | 根据查询检索相关内容 |
| `rag:config:get`    | Request-Response | Renderer → Main | 获取 RAG 配置参数    |
| `rag:config:update` | Request-Response | Renderer → Main | 更新 RAG 配置参数    |

#### Scenario: AI 续写时 RAG 召回前文设定

- **假设** 用户在第十章触发续写，内容涉及「废弃仓库」
- **当** 系统执行 RAG 检索
- **则** 通过 `rag:retrieve` 语义搜索，召回第二章中描写「废弃仓库」环境的段落
- **并且** 召回内容注入 Context Engine 的 Retrieved 层
- **并且** AI 续写结果与前文对「废弃仓库」的描述保持一致

#### Scenario: RAG 召回为空

- **假设** 检索查询与项目文档无语义关联（如项目刚创建，内容极少）
- **当** RAG 检索执行
- **则** 无 chunk 超过 `minScore` 阈值
- **并且** Retrieved 层为空，AI 仅依赖其他层进行生成
- **并且** 功能正常，不报错

#### Scenario: RAG 召回内容超出 token 预算

- **假设** 语义搜索返回 10 个高相关 chunk，总计 3000 tokens
- **当** Context Engine 的 Retrieved 层预算仅有 1500 tokens
- **则** 系统按相似度得分降序截断，保留得分最高的 chunk 直到填满预算
- **并且** 被截断的 chunk 不注入 prompt

---

### Requirement: 搜索替换

系统**必须**支持在当前文档或全项目范围内进行搜索替换。

搜索替换面板通过 `Cmd/Ctrl+H` 打开，包含：

- 搜索输入框 + 替换输入框
- 选项开关：区分大小写、全词匹配、正则表达式
- 作用范围切换：当前文档 / 全项目
- 操作按钮：替换当前 / 全部替换 / 跳过

搜索替换的 IPC 通道（全项目替换时）：

| IPC 通道                 | 通信模式         | 方向            | 用途           |
| ------------------------ | ---------------- | --------------- | -------------- |
| `search:replace:preview` | Request-Response | Renderer → Main | 预览替换影响   |
| `search:replace:execute` | Request-Response | Renderer → Main | 执行全项目替换 |

全项目替换前**必须**预览影响范围（显示受影响的文档数和匹配数），用户确认后执行。

全项目替换**必须**为每个受影响的文档创建版本快照（Version Control），确保可回滚。

#### Scenario: 当前文档内搜索替换

- **假设** 用户在编辑器中按下 `Cmd/Ctrl+H`
- **当** 用户输入搜索词「林小雨」、替换词「林小溪」
- **则** 编辑器高亮所有匹配项
- **当** 用户点击「全部替换」
- **则** 当前文档中所有「林小雨」被替换为「林小溪」

#### Scenario: 全项目搜索替换

- **假设** 用户切换作用范围为「全项目」
- **当** 用户输入搜索词「废弃仓库」、替换词「荒废工厂」
- **则** 系统通过 `search:replace:preview` 预览：显示「3 个文档中有 7 处匹配」
- **当** 用户确认执行
- **则** 系统为 3 个文档分别创建版本快照后执行替换
- **并且** Toast 通知「已替换 7 处」

#### Scenario: 全项目替换的回滚

- **假设** 用户刚执行了全项目替换
- **当** 用户发现替换有误
- **则** 用户可通过 Version Control 将每个受影响文档回滚到替换前的版本

---

### Requirement: 检索算法与排序策略

检索必须采用“两阶段召回 + 融合重排”策略，明确排序可解释性，禁止不透明排序。

算法流程：

1. FTS 召回：使用 SQLite FTS5 BM25，返回 Top 200
2. 语义召回：向量余弦相似度返回 Top 200
3. 去重融合：按 `documentId + chunkId` 去重
4. 重排打分：

```
finalScore = 0.55 * bm25Norm + 0.35 * semanticScore + 0.10 * recencyScore
```

5. 结果截断：返回 Top 50，超过部分分页加载

排序约束：

- 同分时按 `updatedAt` 降序
- `finalScore < 0.25` 的条目默认隐藏
- 每条结果必须返回 `scoreBreakdown`（bm25/semantic/recency）供调试与解释

新增 IPC：

| IPC 通道                | 通信模式         | 方向            | 用途                     |
| ----------------------- | ---------------- | --------------- | ------------------------ |
| `search:rank:explain`   | Request-Response | Renderer → Main | 返回结果打分拆解         |
| `search:query:strategy` | Request-Response | Renderer → Main | 指定 FTS/semantic/hybrid |

#### Scenario: Hybrid 策略返回可解释排序结果

- **假设** 用户以 hybrid 模式搜索「废弃仓库里的旧照片」
- **当** 系统完成两阶段召回与重排
- **则** 返回按 `finalScore` 降序的 Top 50
- **并且** 每条结果包含 `scoreBreakdown`
- **并且** 用户可通过 `search:rank:explain` 查看排序原因

#### Scenario: 大结果集触发分页与截断

- **假设** 查询命中 5,000 条候选 chunk
- **当** 系统完成重排
- **则** 首次仅返回 Top 50 并标记 `hasMore=true`
- **并且** 后续按页增量加载（每页 50 条）
- **并且** 总查询耗时 p95 不超过 900ms

---

### Requirement: 模块级可验收标准（适用于本模块全部 Requirement）

本模块全部 Requirement 统一遵循：

- 量化阈值：
  - 首次结果返回 p95 < 300ms（FTS）
  - hybrid 检索首屏返回 p95 < 650ms
  - `rag:retrieve` 返回 p95 < 450ms
  - 索引重建吞吐 >= 2,000 chunks/s
- 边界与类型安全：
  - `TypeScript strict` 必须开启
  - `search:*`/`embedding:*`/`rag:*` 通道必须 zod 校验
- 失败处理策略：
  - 向量服务不可用时自动降级到 FTS（用户可见提示）
  - FTS 索引损坏时自动重建，重建前返回可重试状态
  - 超时返回 `SEARCH_TIMEOUT`，禁止空白页静默失败
- Owner 决策边界：
  - 排序公式权重、默认 topK、最小分数阈值由 Owner 固定
  - Agent 不可在未审批下调整权重

#### Scenario: 检索性能达标

- **假设** 项目包含 1,000 文档、200,000 chunks
- **当** 用户执行 200 次混合检索
- **则** 首屏返回 p95 < 650ms
- **并且** 无请求超时率 > 1%

#### Scenario: 检索超时的可见降级

- **假设** 语义索引服务响应超过 5s
- **当** hybrid 检索触发超时
- **则** 系统回退 FTS 并返回 `{ code: "SEARCH_TIMEOUT", fallback: "fts" }`
- **并且** UI 显示「语义检索超时，已切换关键词检索」

---

### Requirement: 异常与边界覆盖矩阵

| 类别         | 最低覆盖要求                                    |
| ------------ | ----------------------------------------------- |
| 网络/IO 失败 | 嵌入服务超时、索引文件写入失败、索引重建失败    |
| 数据异常     | 文档编码损坏、chunk offset 非法、向量维度不一致 |
| 并发冲突     | 并发 reindex 与 query、并发 replace 与 autosave |
| 容量溢出     | 索引规模超上限、单次查询返回候选数过大          |
| 权限/安全    | 未授权项目查询、跨项目数据泄露防护              |

#### Scenario: 并发重建索引与检索

- **假设** 管理员触发 `search:fts:reindex`
- **当** 用户同时执行搜索
- **则** 系统优先使用旧索引提供查询并标记 `indexState=rebuilding`
- **并且** 重建完成后原子切换到新索引

#### Scenario: 向量维度异常触发隔离处理

- **假设** 某批 embedding 写入维度与模型声明不一致
- **当** 系统校验向量
- **则** 该批次被隔离并返回 `EMBEDDING_DIMENSION_MISMATCH`
- **并且** 不影响已有索引的在线查询

---

### Non-Functional Requirements

**Performance**

- FTS 查询：p50 < 80ms，p95 < 300ms，p99 < 600ms
- Hybrid 查询：p50 < 220ms，p95 < 650ms，p99 < 1.2s
- RAG 召回：p50 < 150ms，p95 < 450ms，p99 < 900ms

**Capacity**

- 单项目索引上限：5,000,000 chunks
- 单次查询候选上限：10,000（超限强制截断）
- 单项目向量存储上限：20 GB（超限后按 LRU 淘汰低热度 chunk）

**Security & Privacy**

- 索引与向量库按 `projectId` 物理隔离
- 搜索日志仅记录 query hash，不记录原文 query
- RAG 注入内容必须脱敏（邮箱、手机号、密钥模式）

**Concurrency**

- query 与 replace 共享读写锁：查询读锁并发，替换写锁独占
- 同一项目最多 2 个并行 reindex 任务，超过入队
- 并发查询最大 64，超限返回 `SEARCH_BACKPRESSURE`

#### Scenario: 超大索引下稳定查询

- **假设** 项目索引已达 4,800,000 chunks
- **当** 用户持续执行关键词检索
- **则** p95 仍小于 300ms
- **并且** 无内存溢出告警

#### Scenario: 并发超限触发背压

- **假设** 同一项目同时发起 120 个搜索请求
- **当** 超出并发上限 64
- **则** 超限请求返回 `{ code: "SEARCH_BACKPRESSURE", retryAfterMs: 200 }`
- **并且** 已受理请求不被饿死
