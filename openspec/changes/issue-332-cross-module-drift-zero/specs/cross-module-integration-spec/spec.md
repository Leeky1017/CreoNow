# Cross Module Integration Specification Delta

## Change: issue-332-cross-module-drift-zero

### Requirement: 跨模块契约期望项必须与命名治理一致 [MODIFIED]

cross-module 基线中的通道期望必须满足 IPC 命名治理（`domain:resource:action` + 小写资源/动作）。
以下历史冲突项统一为命名治理兼容的 canonical 通道：

- `knowledge:query:byIds` → `knowledge:query:byids`
- `skill:execute` → `ai:skill:run`
- `skill:cancel` → `ai:skill:cancel`
- `export:project` → `export:project:bundle`

#### Scenario: 历史 alias 漂移被消除 [MODIFIED] (S1)

- **假设** baseline 不再配置 `channelAliases`
- **当** 执行 `cross-module:check`
- **则** 不出现 alias 类 DRIFT
- **并且** canonical 通道在实际契约中直接命中

### Requirement: 技能流式推送使用双通道契约 [ADDED]

AI 技能流式输出必须通过 `skill:stream:chunk` 与 `skill:stream:done` 两条推送通道表达：

- `skill:stream:chunk`：增量 chunk / run started
- `skill:stream:done`：run completed / failed / canceled

cross-module gate 在读取 request-response 契约之外，必须额外采集共享流式通道定义，避免将 push 通道误报为 missing。

#### Scenario: 流式通道可被门禁识别 [ADDED] (S2)

- **假设** 流式通道定义在共享类型中
- **当** 执行 `cross-module:check`
- **则** `skill:stream:chunk` 与 `skill:stream:done` 被识别为实际通道
- **并且** 不出现 approved-missing-channel 放行

### Requirement: 跨模块错误码与 envelope 漂移必须清零 [MODIFIED]

cross-module 基线必须直接覆盖以下错误码，不得通过 `approvedMissingErrorCodes` 放行：

- `PROJECT_SWITCH_TIMEOUT`
- `DOCUMENT_SAVE_CONFLICT`
- `MEMORY_BACKPRESSURE`
- `SKILL_TIMEOUT`
- `AI_PROVIDER_UNAVAILABLE`
- `VERSION_MERGE_TIMEOUT`
- `SEARCH_TIMEOUT`
- `CONTEXT_SCOPE_VIOLATION`

同时 envelope 语义统一为 IPC 主规范已落地的 `ok`。

#### Scenario: 错误码缺口清零 [MODIFIED] (S3)

- **假设** baseline 不再配置 `approvedMissingErrorCodes`
- **当** 执行 `cross-module:check`
- **则** 不出现 missing-error-code / approved-missing-error-code 漂移
- **并且** 以上错误码都存在于生成类型

#### Scenario: envelope 与 IPC 主规范一致 [MODIFIED] (S4)

- **假设** baseline 的 `desiredEnvelope` 为 `ok`
- **当** 执行 `cross-module:check`
- **则** 不出现 envelope drift
- **并且** baseline 不再配置 `approvedEnvelopeDrift`
