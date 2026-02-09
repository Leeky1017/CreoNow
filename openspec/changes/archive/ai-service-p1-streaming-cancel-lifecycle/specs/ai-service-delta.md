# AI Service Specification Delta

## Change: ai-service-p1-streaming-cancel-lifecycle

### Requirement: 流式响应处理 [MODIFIED]

系统必须将流式执行行为约束为可验证生命周期，保证取消、完成、网络异常并发下行为一致。

- 主进程必须先返回 `executionId`，随后按序推送 `skill:stream:chunk`，最终推送一次 `skill:stream:done`。
- `skill:stream:done` 必须携带终态：`completed | cancelled | error`。
- 网络中断后重试必须使用完整 prompt 重新请求（非断点续传）。
- 当取消事件与完成事件并发到达时，必须以取消为最终态。

#### Scenario: 流式生命周期可判定闭环 [ADDED]

- **假设** 用户触发一次流式续写
- **当** 主进程开始执行并持续产生 chunk
- **则** 渲染层先收到 `executionId`，再收到多个 `skill:stream:chunk`
- **并且** 仅收到一次 `skill:stream:done` 作为终态收敛

#### Scenario: 取消与完成并发时取消优先 [ADDED]

- **假设** 用户点击「停止生成」与最后一个 `skill:stream:done` 几乎同时到达
- **当** 状态机处理竞态
- **则** 最终状态为 `cancelled`
- **并且** 后续 chunk/done 不再改变最终态
