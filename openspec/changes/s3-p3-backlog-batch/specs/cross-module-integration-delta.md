# Cross Module Integration Specification Delta

## Change: s3-p3-backlog-batch

### Requirement: Sprint 3 P3 批量治理必须以审计清单驱动并保持跨模块契约稳定 [ADDED]

系统在执行 Sprint 3 P3 低危问题批量修复时，必须遵循“清单可追溯 + 行为不漂移 + 防线可验证”的治理约束。

- 批处理范围必须严格对应 roadmap 定义的 14 个 Low 级审计子项 [ADDED]
- 每个子项必须具备“审计编号 -> 修复文件 -> 验证用例”的追踪关系 [ADDED]
- 批处理修复不得改变跨模块对外契约（接口签名、错误码、IPC 语义）[ADDED]
- 清理类改动不得引入 ADDONLY 双路径或新的 NOISE/DRIFT [ADDED]

#### Scenario: CMI-S3-BB-S1 14 子项覆盖完整且可追溯 [ADDED]

- **假设** `s3-p3-backlog-batch` 已进入实现阶段
- **当** 检查批处理清单与代码变更证据
- **则** 14 个审计子项均有对应修复记录
- **并且** 每个子项都可追溯到至少一个验证测试

#### Scenario: CMI-S3-BB-S2 批处理后跨模块契约保持不变 [ADDED]

- **假设** 修复覆盖多个模块与文件
- **当** 执行回归验证
- **则** 对外接口签名、错误语义与 IPC 契约保持与修复前一致
- **并且** 不产生新增通道或契约字段漂移

#### Scenario: CMI-S3-BB-S3 低危复发防线必须可验证 [ADDED]

- **假设** 批处理包含断言强化、输入校验、资源释放、编码规范等治理项
- **当** 执行对应单元与集成测试
- **则** 复发防线的关键行为均被测试覆盖
- **并且** 任何防线失效都能在测试或门禁阶段暴露

#### Scenario: CMI-S3-BB-S4 清理项不引入 ADDONLY/NOISE/DRIFT 回退 [ADDED]

- **假设** 批处理包含注释、命名、BOM、历史 TODO 等清理类改动
- **当** 执行 lint 与回归检查
- **则** 清理后代码路径保持单一来源
- **并且** 不新增噪声项或风格漂移项

## Out of Scope

- 处理 Sprint 3 之外的 Medium/High 风险问题
- 引入新功能、新 IPC 通道或新产品行为
- 重写跨模块主契约或替换既有架构层边界
