# Memory System Delta — memory-system-p3-isolation-degradation

## [ADDED] Requirement: 记忆隔离与作用域（project > global）

记忆作用域必须支持全局级与项目级，并满足以下优先级与操作约束：

- 项目级规则优先于全局级规则。
- 无项目级匹配时回退全局级。
- 用户可将项目级规则提升为全局级。
- 清理操作分为项目级清除与全量清除，均需二次确认。

IPC 约束：

- `memory:clear:project`（Request-Response）
- `memory:clear:all`（Request-Response）
- `memory:promote`（Request-Response）

### Scenario: MS4-R1-S1 项目级规则覆盖全局规则

- **假设** 全局规则为第一人称，当前项目规则为第三人称全知
- **当** 当前项目触发续写
- **则** 注入项目级规则并忽略冲突的全局规则
- **并且** 记忆来源中标记 `scope=project`

### Scenario: MS4-R1-S2 用户将项目规则提升为全局

- **假设** 某项目规则被用户认为跨项目通用
- **当** 用户在面板执行“提升为全局”
- **则** 系统通过 `memory:promote` 更新规则 scope 为 `global`
- **并且** 保留来源信息与版本历史

### Scenario: MS4-R1-S3 清除操作执行前必须完成二次确认

- **假设** 用户触发“清除本项目记忆”或“清除全部记忆”
- **当** 二次确认通过
- **则** 系统按粒度执行对应删除
- **并且** 返回可判定结果 `{ ok: true }`

## [ADDED] Requirement: 记忆系统降级策略（四档）

系统必须定义并执行以下降级档位，且不阻断核心写作流程：

1. 向量索引不可用：回退时间+场景精确匹配
2. 语义记忆为空：回退内置默认规则
3. 情景库损坏：保留语义规则继续注入
4. 全部记忆不可用：仅依赖 Context Engine 的 Rules + Immediate

### Scenario: MS4-R2-S1 向量索引故障降级到精确匹配

- **假设** 语义向量索引服务不可用
- **当** 系统执行情景召回
- **则** 自动降级为时间+场景精确匹配
- **并且** 记录降级事件 `MEMORY_DEGRADE_VECTOR_OFFLINE`

### Scenario: MS4-R2-S2 全部记忆不可用时退化为 CE 基础层

- **假设** 情景库与语义库均不可读
- **当** Context Engine 请求记忆注入
- **则** Memory System 返回 `memoryDegraded=true`
- **并且** 仅保留 Rules + Immediate 注入路径
- **并且** AI 主流程继续可用

## [ADDED] Requirement: 模块级可验收与异常覆盖（MS-4 范围）

本 change 必须覆盖异常矩阵中的以下范围：

- 权限/安全：全量清除未确认
- 网络/IO 失败：蒸馏调用失败导致降级

### Scenario: MS4-X-S1 全量清除未确认必须拒绝执行

- **假设** 用户请求 `memory:clear:all`
- **当** 未通过二次确认
- **则** 返回错误 `MEMORY_CLEAR_CONFIRM_REQUIRED`
- **并且** 不执行任何删除操作

### Scenario: MS4-X-S2 蒸馏调用失败触发降级并保留可用记忆层

- **假设** 蒸馏依赖的网络调用失败
- **当** 系统更新语义记忆失败
- **则** 进入降级模式并回退到“已有规则 + 默认规则”
- **并且** 记录事件 `MEMORY_DEGRADE_DISTILL_IO_FAILED`
- **并且** 不阻断用户续写

## Out of Scope

- Context Engine 注入实现细节。
- AI Service 实际上游调用改造。
- 蒸馏算法与冲突算法实现细节。
