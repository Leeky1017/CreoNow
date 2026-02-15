# Search & Retrieval Specification Delta

## Change: s3-embedding-service

### Requirement: Embedding Service 必须统一 provider 编排与错误语义 [ADDED]

系统必须通过统一 Embedding Service 承接 provider 选择、调用与结果校验，禁止在 IPC 或调用方重复实现平行编排逻辑。

#### Scenario: S3-ES-S1 Primary provider 成功时不触发 fallback [ADDED]

- **假设** primary provider 可用且在超时阈值内返回向量
- **当** 系统执行 `embedding:generate`
- **则** 返回 primary provider 结果
- **并且** 不记录 fallback warning

### Requirement: fallback 策略必须显式配置且可观测 [MODIFIED]

系统必须仅在配置允许且满足触发条件时执行 fallback；当 fallback 禁用或不可用时，必须返回显式错误而非静默成功。

#### Scenario: S3-ES-S2 Primary 超时时按配置触发 fallback 并记录结构化 warning [MODIFIED]

- **假设** primary provider 超时且 fallback provider 可用
- **当** Embedding Service 完成一次降级调用
- **则** 返回 fallback provider 结果
- **并且** 记录包含 `primaryProvider`、`fallbackProvider`、`reason` 的 warning

#### Scenario: S3-ES-S3 fallback 禁用时返回明确失败 [ADDED]

- **假设** primary provider 失败且 fallback 功能被禁用
- **当** 系统执行 `embedding:generate`
- **则** 返回错误码 `EMBEDDING_PROVIDER_UNAVAILABLE`
- **并且** 不以空向量或空数组伪装成功

## Out of Scope

- Hybrid RAG 排序融合公式与解释字段变更
- 搜索面板 UI 与交互改造
- 任何与 embedding 编排无关的新增 IPC 通道
