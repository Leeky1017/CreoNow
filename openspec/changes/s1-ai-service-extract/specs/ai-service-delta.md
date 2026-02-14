# AI Service Specification Delta

## Change: s1-ai-service-extract

### Requirement: AI Service 必须完成关键子模块提取且保持对外契约稳定 [MODIFIED]

AI Service 必须将运行时配置解析、错误映射与 provider 路由从 `aiService.ts` 提取为独立子模块，`aiService.ts` 仅保留聚合与调度职责。提取后必须保持 `createAiService` 对外接口、返回包络与可观测行为语义不变。

#### Scenario: AI-S1-ASE-S1 提取 runtimeConfig/errorMapper 并收口为单一路径 [ADDED]

- **假设** AI Service 需要执行 token 估算、系统提示拼接、超时/预算解析与上游错误码映射
- **当** `createAiService` 处理运行时配置与错误转换
- **则** 必须委托给 `runtimeConfig` 与 `errorMapper` 模块
- **并且** `aiService.ts` 不得保留功能等价的内联重复实现

#### Scenario: AI-S1-ASE-S2 providerResolver 状态按实例隔离 [ADDED]

- **假设** 系统创建多个 `providerResolver` 实例用于不同 AI Service 生命周期
- **当** 某一实例更新 provider 健康状态、退避信息或解析缓存
- **则** 该状态仅对当前实例可见
- **并且** 不得通过模块级可变变量泄漏到其他实例

#### Scenario: AI-S1-ASE-S3 对外接口不变且行为契约回归通过 [ADDED]

- **假设** 完成 `runtimeConfig/errorMapper/providerResolver` 提取并接入 `aiService.ts`
- **当** 调用方继续使用 `createAiService` 暴露的核心能力（如 `runSkill`、`cancel`、`listModels`）
- **则** 方法签名、返回包络与错误语义保持兼容
- **并且** 不得引入新增必填参数、通道语义变化或破坏既有调用路径

## Out of Scope

- 新增 provider、调整模型策略或改变重试/限流产品规则。
- 修改 IPC 通道命名、前端交互协议或错误码字典规范。
- 引入与本次提取无关的 AI Service 新功能。
