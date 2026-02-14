# Context Engine Specification Delta

## Change: s1-break-context-cycle

### Requirement: 上下文组装 API 的依赖拓扑必须无环且职责边界清晰 [MODIFIED]

Context Engine 的 `layerAssemblyService` 与 fetcher 子模块必须保持单向依赖：装配层可依赖 fetcher，fetcher 不得反向依赖装配层运行时实现。共享类型与纯函数必须放在独立模块，避免跨层回流与循环耦合。

#### Scenario: CE-S1-BCC-S1 fetcher 仅从共享类型模块获取上下文类型 [ADDED]

- **假设** `rulesFetcher.ts`、`retrievedFetcher.ts`、`settingsFetcher.ts` 需要 `ContextLayerChunk` 与相关上下文类型
- **当** Context Engine 进行类型导入
- **则** fetcher 必须从 `services/context/types.ts` 导入类型
- **并且** fetcher 不得从 `layerAssemblyService.ts` 反向导入任何类型或运行时符号

#### Scenario: CE-S1-BCC-S2 实体格式化函数从独立 utility 导出 [ADDED]

- **假设** `rulesFetcher` 与 `retrievedFetcher` 需要共享实体格式化逻辑
- **当** 两者消费 `formatEntityForContext`
- **则** 必须从 `services/context/utils/formatEntity.ts` 导入
- **并且** 不得通过 `retrievedFetcher -> rulesFetcher` 的中转 import 复用该函数

#### Scenario: CE-S1-BCC-S3 依赖解耦后保持装配契约不变且无循环 [MODIFIED]

- **假设** 完成 `types.ts` 与 `utils/formatEntity.ts` 提取并更新 import
- **当** 执行 Context Engine 构建与循环检测
- **则** `services/context/` 目录不得出现新的循环依赖
- **并且** `context:assemble` 的输入/输出契约与原有行为保持一致（仅依赖拓扑变更）

## Out of Scope

- 调整四层上下文的语义、优先级和 token 预算策略。
- 新增 fetcher 业务能力或改变 KG/Memory/Settings 的检索规则。
