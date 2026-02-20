# workbench Specification Delta

## Change: aud-c1c-renderer-fireforget-lint-guard

### Requirement: renderer fire-and-forget 必须具备兜底错误处理与 lint guard（Wave2 / C1C）[ADDED]

系统必须为 renderer 的 fire-and-forget 异步调用提供可审计的统一入口与静态 guard，满足：

- 任何 fire-and-forget promise 必须附带 rejection 处理，不得静默吞错。
- 默认错误路径必须可观测（至少记录 `console.error`），避免 silent failure。
- 必须提供 lint guard 阻断裸 `void (async () => ...)()` 入口，确保代码库内入口可被治理收敛到统一 helper。

#### Scenario: WB-AUD-C1C-S1 lint guard 阻断裸 `void (async () => ...)()` 入口 [ADDED]

- **假设** renderer 源码出现裸 `void (async () => { ... })()` 形式的异步调用
- **当** ESLint 规则执行
- **则** 必须产生 lint violation
- **并且** violation 信息明确指向“应使用受控 fire-and-forget helper”

#### Scenario: WB-AUD-C1C-S2 helper 不得 silent swallow，必须捕获并处理 reject [ADDED]

- **假设** fire-and-forget task 在异步路径中抛出异常
- **当** 使用 `runFireAndForget` 执行该 task
- **则** 默认行为必须记录错误（`console.error`）
- **并且** 当提供 `onError` 时，异常必须被回调捕获（调用方可回归验证）
