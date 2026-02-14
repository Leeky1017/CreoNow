# Cross Module Integration Specification Delta

## Change: s1-runtime-config

### Requirement: 运行时治理配置必须集中定义并保持跨进程一致 [ADDED]

系统必须将关键运行时治理阈值收敛到统一配置中心，确保 default、env 覆盖与非法值回退在 main/preload 的语义一致。

治理配置至少覆盖以下 key：

- `ipc.maxPayloadBytes`
- `ai.timeoutMs`
- `ai.retryBackoffMs`
- `ai.sessionTokenBudget`
- `kg.queryTimeoutMs`
- `rag.maxTokens`

#### Scenario: S1-RC-S1 未设置 env 时返回统一默认值 [ADDED]

- **假设** 运行环境未设置对应治理配置 env
- **当** main/preload 读取上述治理 key
- **则** 返回 unified-roadmap 约定的默认值
- **并且** 不允许模块私有默认值覆盖配置中心默认值

#### Scenario: S1-RC-S2 合法 env 覆盖默认值 [ADDED]

- **假设** 设置合法 env（含 number 与 number[]）
- **当** 读取对应治理 key
- **则** env 值优先于默认值生效
- **并且** main/preload 对同一 key 的覆盖结果一致

#### Scenario: S1-RC-S3 非法 env 回退默认值且 preload/main 保持一致 [ADDED]

- **假设** env 值非法（非数字、空值、格式错误数组）
- **当** main/preload 读取对应治理 key
- **则** 回退到配置中心默认值
- **并且** preload/main 回退结果一致，不得出现跨进程分叉

## Out of Scope

- 新增远程配置下发或运行时热更新机制
- 调整 IPC 通道命名、错误码字典或权限模型
