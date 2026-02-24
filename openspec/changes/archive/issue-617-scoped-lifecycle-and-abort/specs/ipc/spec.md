# IPC Specification Delta

更新时间：2026-02-23 23:06

## Change: issue-617-scoped-lifecycle-and-abort

### Requirement: IPC timeout 必须中止底层 handler 执行（无幽灵执行） [ADDED]

IPC 层**必须**将超时语义与底层执行绑定，避免仅拒绝外层 Promise 而底层 handler 继续运行（幽灵执行）。

- Request-Response 调用触发 timeout 时：返回错误码 `IPC_TIMEOUT`（沿用主 spec 的错误码字典）。
- 触发 timeout 时：必须向底层 handler 传播取消信号（AbortSignal/等价机制），并确保后续副作用不再继续发生。
- 该行为必须可被自动化测试验证（不依赖真实 Electron 运行时）。

#### Scenario: BE-SLA-S2 IPC timeout 通过 AbortSignal 中止底层执行 [ADDED]

- **假设** 某个 IPC handler 内部包含可持续执行/持续副作用的长耗时步骤
- **当** IPC 层触发 timeout
- **则** timeout 不仅返回 `IPC_TIMEOUT`，还会触发 AbortSignal（或等价机制）中止底层执行
- **并且** 超时后不再发生任何来自该 handler 的后续副作用（不存在幽灵执行）
