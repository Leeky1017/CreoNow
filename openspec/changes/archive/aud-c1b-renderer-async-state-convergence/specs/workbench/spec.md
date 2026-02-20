# workbench Specification Delta

## Change: aud-c1b-renderer-async-state-convergence

### Requirement: Renderer 异步刷新必须收敛到确定性终态（Wave1 / C1B）[ADDED]

Renderer 的 store/panel 在执行异步刷新（例如 skills 列表、模型列表）时，必须在成功或失败后收敛到确定性的 UI/状态终态，避免出现“永远 loading”的漂移。

#### Scenario: WB-AUD-C1B-S2 refresh 抛错后必须退出 loading 并进入 error 终态 [ADDED]

- **假设** renderer 发起异步刷新（如 `refreshSkills()` 或 models refresh）并在内部调用 IPC `invoke`
- **当** `invoke` 抛出异常（例如网络失败）
- **则** store 必须将状态收敛为失败终态：
  - `skillsStatus === "error"`（或等价错误状态）
  - `skillsLastError.code === "INTERNAL"`（可追踪错误码）
- **并且** UI 不得持续停留在 `Loading`，必须显示可用的 fallback 内容（例如保留/回落到默认模型项）
