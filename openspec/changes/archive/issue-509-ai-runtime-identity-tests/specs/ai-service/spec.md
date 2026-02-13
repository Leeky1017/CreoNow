# AI Service Specification Delta

## Change: issue-509-ai-runtime-identity-tests

### Requirement: 运行时 system prompt 必须接入 identity 分层组装 [MODIFIED]

`aiService.runSkill` 的 provider 请求组装必须使用 `assembleSystemPrompt`，并显式注入 `GLOBAL_IDENTITY_PROMPT`，保证运行时 system prompt 包含 identity 层。

运行时拼装顺序固定为：

1. `globalIdentity`（`GLOBAL_IDENTITY_PROMPT`）
2. `userRules`（如有）
3. `skillSystemPrompt`（skill prompt）
4. `modeHint`（agent/plan/ask）
5. `memoryOverlay`（如有）
6. `contextOverlay`（Context Engine 输出）

缺省或空白层必须跳过，不得产生空占位分隔符；最终 provider 侧仍接收单一 system 字符串。

#### Scenario: AIS-RUNTIME-S1 non-stream 请求包含 identity 层 [ADDED]

- **假设** 调用 `runSkill`（`stream=false`），输入包含 `systemPrompt` 与 `system`
- **当** `aiService` 组装 provider 请求体
- **则** 首条 system message 内容包含 `GLOBAL_IDENTITY_PROMPT`
- **并且** identity 内容出现在 skill prompt 与 context overlay 之前

#### Scenario: AIS-RUNTIME-S2 stream 请求包含 identity 层 [ADDED]

- **假设** 调用 `runSkill`（`stream=true`），输入包含 `systemPrompt` 与 `system`
- **当** `aiService` 组装 provider 请求体
- **则** 请求体中的 system message 内容包含 `GLOBAL_IDENTITY_PROMPT`
- **并且** `skill:stream:chunk` / `skill:stream:done` 生命周期契约不变

### Requirement: stream timeout 的终态收敛可判定 [MODIFIED]

当 stream 执行触发超时，系统必须通过 `skill:stream:done` 终态事件显式给出 `error.code = SKILL_TIMEOUT`，并只收敛一次。

#### Scenario: AIS-TIMEOUT-S1 stream 超时触发 done 错误终态 [ADDED]

- **假设** 一次 `stream=true` 的技能执行超时
- **当** 主进程终止该次执行
- **则** 渲染侧收到一次 `skill:stream:done`
- **并且** `terminal = error` 且 `error.code = SKILL_TIMEOUT`
