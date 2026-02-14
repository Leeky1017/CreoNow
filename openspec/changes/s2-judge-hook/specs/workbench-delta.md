# Workbench Specification Delta

## Change: s2-judge-hook

### Requirement: judge:model:ensure 状态机必须通过共享 hook 收敛 [MODIFIED]

Workbench 中涉及 `judge:model:ensure` 的状态管理必须由共享 hook 统一提供，避免调用点各自维护重复状态机：

- 至少两个调用点必须使用同一 `useJudgeEnsure` hook。
- hook 必须输出一致的 `busy`、`downloading`、`error` 状态语义。
- 调用点不得再保留等价的本地状态机分支。

#### Scenario: 两个调用点复用同一状态机输出 [ADDED]

- **假设** Settings 与另一个 judge 消费视图同时接入 `judge:model:ensure`
- **当** 触发 ensure 流程
- **则** 两处视图均通过 `useJudgeEnsure` 获取状态
- **并且** `busy/downloading/error` 的语义和命名保持一致

#### Scenario: ensure 失败后状态按统一规则复位 [ADDED]

- **假设** `judge:model:ensure` 返回失败
- **当** hook 处理失败结果
- **则** `error` 被设置为可展示错误
- **并且** `busy` 与 `downloading` 在收敛流程结束后归位为 `false`

## Out of Scope

- judge 模型下载协议、网络重试策略与缓存策略
- 设置页其它与 judge 无关的交互项
