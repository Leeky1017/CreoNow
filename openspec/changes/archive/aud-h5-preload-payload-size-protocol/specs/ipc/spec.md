# ipc Specification Delta

## Change: aud-h5-preload-payload-size-protocol

### Requirement: preload IPC gateway 必须执行 allowlist + payload 上限 + 短路协议（Wave0 / H5）[ADDED]

Preload IPC gateway 必须作为安全边界执行确定性校验，至少满足：

- 通道未授权必须拒绝并返回 `{ ok: false, error: { code: "IPC_CHANNEL_FORBIDDEN", message } }`，并写入审计事件。
- payload 超过 `MAX_IPC_PAYLOAD_BYTES` 必须拒绝并返回 `{ ok: false, error: { code: "IPC_PAYLOAD_TOO_LARGE", details } }`，并写入审计事件。
- 一旦判定 payload 超限，必须短路：不得继续读取 payload 的其它字段（避免危险 getter/副作用）。
- AI stream subscription 数量必须受限，超限返回 `{ ok: false, error: { code: "IPC_SUBSCRIPTION_LIMIT_EXCEEDED", message } }`，并写入审计事件。

#### Scenario: IPC-AUD-H5-S1 未授权通道被拒绝并写入审计事件 [ADDED]

- **假设** renderer 调用的 channel 不在 allowlist
- **当** preload gateway 执行 `invoke(channel, payload)`
- **则** 必须拒绝且不得调用底层 `invoke`
- **并且** 返回错误码 `IPC_CHANNEL_FORBIDDEN`
- **并且** 写入审计事件 `ipc_channel_forbidden`

#### Scenario: IPC-AUD-H5-S2 payload 超限被拒绝且必须短路危险字段读取 [ADDED]

- **假设** payload 大小超过 `MAX_IPC_PAYLOAD_BYTES`
- **当** preload gateway 执行 `invoke(channel, payload)`
- **则** 必须拒绝且不得调用底层 `invoke`
- **并且** 返回错误码 `IPC_PAYLOAD_TOO_LARGE` 并写入审计事件 `ipc_payload_too_large`
- **并且** 在判定超限后不得访问 payload 其它字段（例如 getter），以保证短路协议生效

#### Scenario: IPC-AUD-H5-S3 stream subscription 超限被拒绝并写入审计事件 [ADDED]

- **假设** subscription 数量超过上限
- **当** renderer 注册新的 stream subscription
- **则** 必须返回错误码 `IPC_SUBSCRIPTION_LIMIT_EXCEEDED`
- **并且** 写入审计事件 `ipc_subscription_limit_exceeded`
