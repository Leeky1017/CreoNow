# AI Service Specification Delta

## Change: ai-panel-model-mode-wiring

### Requirement: LLM 代理调用 [MODIFIED]

AI Service 在执行 `ai:skill:run` 时必须消费并生效请求内的 `mode` 与 `model`：

- `model` 必须用于上游 provider 请求体中的模型字段（不再固定为常量）
- `mode` 必须映射为确定性的请求策略（至少包含 `plan` 的稳定提示注入）

该行为仅针对当前 run 生效，不得修改全局 provider 配置。

#### Scenario: 面板 model 选择驱动上游请求模型 [ADDED]

- **假设** 用户选择 model=`claude-opus`
- **当** 执行 `ai:skill:run`
- **则** AI Service 发起上游请求时 model 字段为 `claude-opus`
- **并且** 不依赖环境变量中的默认 model 覆盖

#### Scenario: plan 模式注入稳定提示 [ADDED]

- **假设** 用户选择 mode=`plan`
- **当** 执行 `ai:skill:run`
- **则** AI Service 追加确定性的 planning 指令到 system 文本
- **并且** 响应仍通过既有流式/非流式状态机返回
