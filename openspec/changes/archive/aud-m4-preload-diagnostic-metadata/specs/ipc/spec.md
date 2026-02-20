# ipc Specification Delta

## Change: aud-m4-preload-diagnostic-metadata

### Requirement: preload 必须为 INVALID_ARGUMENT 提供可审计诊断元数据（Wave1 / M4）[ADDED]

当 renderer 传入不可序列化的 payload（例如包含 `BigInt`）时，preload gateway 必须拒绝调用并返回 `INVALID_ARGUMENT`，同时提供“安全且可审计”的诊断元数据，帮助定位问题但不泄露敏感内容。

#### Scenario: IPC-AUD-M4-S1 INVALID_ARGUMENT 必须包含结构摘要与字段路径 [ADDED]

- **假设** payload 含不可序列化值（例如 `payload.input.dangerousBigInt = 1n`）
- **当** 调用 `gateway.invoke(channel, payload)`
- **则** 返回 `{ ok: false, error: { code: "INVALID_ARGUMENT" } }`
- **并且** `error.details` 必须包含：
  - `shape.rootType`（例如 `"object"`）
  - `shape.keyCount`（顶层 key 数量）
  - `serializationIssue.path`（例如 `"$.input.dangerousBigInt"`）
  - `serializationIssue.reason`（例如 `"BIGINT_NOT_SERIALIZABLE"`）
