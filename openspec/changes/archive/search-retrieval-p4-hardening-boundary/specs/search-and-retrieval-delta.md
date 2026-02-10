# Search & Retrieval Specification Delta

## Change: search-retrieval-p4-hardening-boundary

### Requirement: 模块级可验收标准 [MODIFIED]

SR-5 固化 SR 全链路验收阈值与可见降级契约。

硬阈值（P95）：

- FTS 首次返回：`< 300ms`
- Hybrid 首屏返回：`< 650ms`
- `rag:retrieve`：`< 450ms`
- 索引重建吞吐：`>= 2,000 chunks/s`

超时与降级契约：

- 任一检索链路超时返回：`{ code: "SEARCH_TIMEOUT", fallback: "fts" | "none" }`
- 语义链路超时或不可用时默认 `fallback="fts"`
- UI 必须展示可见提示，禁止 silent failure

可观测性字段：

- `traceId`
- `strategy`
- `fallback`
- `costMs`

#### Scenario: SR5-R1-S1 检索性能达到模块阈值 [MODIFIED]

- **假设** 项目数据规模达到主 spec 压力基线
- **当** 执行 FTS/Hybrid/RAG 压测
- **则** 关键链路 p95 指标满足阈值
- **并且** 索引重建吞吐不低于 2,000 chunks/s

#### Scenario: SR5-R1-S2 超时触发可见降级 [MODIFIED]

- **假设** 语义链路响应超时
- **当** 用户发起 hybrid 查询
- **则** 返回 `SEARCH_TIMEOUT` 与 `fallback="fts"`
- **并且** UI 明示「语义检索超时，已切换关键词检索」

### Requirement: 异常与边界覆盖矩阵 [MODIFIED]

SR-5 在主 spec 基础上补齐可执行矩阵场景，覆盖网络/IO、数据异常、并发冲突、容量溢出、权限安全。

新增错误码与阻断约束：

- `SEARCH_REINDEX_IO_ERROR`：索引写入失败
- `SEARCH_DATA_CORRUPTED`：chunk 偏移或编码异常
- `SEARCH_CONCURRENT_WRITE_CONFLICT`：replace 与 autosave 冲突
- `SEARCH_CAPACITY_EXCEEDED`：索引/向量容量超限
- `SEARCH_PROJECT_FORBIDDEN`：跨项目查询或替换被阻断

安全边界：

- 任何查询、替换、召回必须强校验 `projectId`。
- `projectId` 不匹配必须拒绝执行并记录审计日志。

#### Scenario: SR5-R2-S1 网络/IO 失败触发可重试错误 [ADDED]

- **假设** 索引重建过程中发生磁盘写入异常
- **当** 系统执行 reindex
- **则** 返回 `SEARCH_REINDEX_IO_ERROR`
- **并且** 响应包含 `retryable=true`

#### Scenario: SR5-R2-S2 数据异常被隔离不影响在线查询 [ADDED]

- **假设** 某批 chunk 出现非法 offset 或编码损坏
- **当** 系统执行数据校验
- **则** 异常数据被隔离并返回 `SEARCH_DATA_CORRUPTED`
- **并且** 已建立索引的在线查询继续可用

#### Scenario: SR5-R2-S3 并发冲突可判定返回 [ADDED]

- **假设** 用户正在执行全项目 replace，autosave 同时写入同文档
- **当** 写锁竞争发生
- **则** 返回 `SEARCH_CONCURRENT_WRITE_CONFLICT`
- **并且** 未提交写入保持原子性，不产生半替换状态

#### Scenario: SR5-R2-S4 容量溢出触发背压与截断 [ADDED]

- **假设** 单次查询候选超过 10,000 或向量库存储超过 20GB
- **当** 系统执行检索
- **则** 返回 `SEARCH_CAPACITY_EXCEEDED` 或触发 `SEARCH_BACKPRESSURE`
- **并且** 提供可重试建议与 `retryAfterMs`

#### Scenario: SR5-R2-S5 跨项目查询被阻断并审计 [ADDED]

- **假设** 请求携带的 `projectId` 与目标索引不一致
- **当** 系统执行 `search:*`、`embedding:*` 或 `rag:*`
- **则** 返回 `SEARCH_PROJECT_FORBIDDEN`
- **并且** 记录结构化审计事件，不泄露跨项目数据

## Out of Scope

- 新增第三种检索算法。
- 修改 Owner 固定的权重与默认阈值。
- 扩展非必要 UI 动效或视觉主题。
