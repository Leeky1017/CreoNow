# workbench Specification Delta

## Change: aud-c1a-renderer-safeinvoke-contract

### Requirement: renderer IPC 调用必须统一为 safeInvoke envelope（Wave0 / C1A）[ADDED]

Renderer 必须提供统一的 IPC 调用入口 `safeInvoke`，并将 `invoke` 固定为别名（避免多入口漂移），同时保证：

- 成功路径返回 `{ ok: true, data }`。
- 失败路径返回 `{ ok: false, error: { code, message, details? } }`，不得抛异常导致调用方 silent crash。
- bridge 缺失、promise reject、响应 shape 异常必须收敛为确定性错误。

#### Scenario: WB-AUD-C1A-S1 `invoke` 为 `safeInvoke` 别名且可透传合法 envelope [ADDED]

- **假设** preload bridge 存在且返回合法 envelope `{ ok: true, data: {} }`
- **当** 调用 `invoke(channel, payload)`
- **则** `invoke === safeInvoke`
- **并且** 返回值必须原样透传为 `{ ok: true, data: {} }`

#### Scenario: WB-AUD-C1A-S2 bridge 缺失返回确定性 INTERNAL 错误 [ADDED]

- **假设** `window.creonow` bridge 缺失
- **当** 调用 `invoke(channel, payload)`
- **则** 返回 `{ ok: false, error: { code: "INTERNAL", message: "IPC bridge not available" } }`

#### Scenario: WB-AUD-C1A-S3 promise reject 必须被规范化为 envelope 错误 [ADDED]

- **假设** 底层 invoke 抛出 `Error("network down")` 或非 Error throwable
- **当** 调用 `invoke(channel, payload)`
- **则** 返回 `{ ok: false, error: { code: "INTERNAL", message: "IPC invoke failed", details: { message } } }`
- **并且** 不得向调用方传播未捕获异常

#### Scenario: WB-AUD-C1A-S4 非 envelope 响应 shape 必须被拒绝 [ADDED]

- **假设** 底层 invoke 返回非 envelope shape（例如 `"not-envelope"`）
- **当** 调用 `invoke(channel, payload)`
- **则** 返回 `{ ok: false, error: { code: "INTERNAL", message: "Invalid IPC response shape" } }`
