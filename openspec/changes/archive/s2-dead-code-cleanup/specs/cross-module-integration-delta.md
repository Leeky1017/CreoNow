# Cross Module Integration Specification Delta

## Change: s2-dead-code-cleanup

### Requirement: 跨模块链路死代码清理必须保持行为等价 [MODIFIED]

跨模块相关实现中的死代码与噪声代码可被清理，但必须满足行为等价约束：

- 启动链路 ping 处理去除不可达 catch 后，对外结果与错误语义保持一致。
- KG 运行时去除一行包装函数后，调用目标实现的输入输出保持一致。
- `AiDialogs` barrel 清理注释噪声后，导出面保持不变。

#### Scenario: ping 链路移除不可达 catch 后对外行为不变 [ADDED]

- **假设** 应用执行既有 ping 健康检查路径
- **当** 清理不可达 catch 分支后运行同一检查
- **则** 健康检查结果与原行为一致
- **并且** 不新增或丢失对外错误语义

#### Scenario: 去除 KG 一行包装函数后调用语义不变 [ADDED]

- **假设** KG 识别运行时通过包装函数调用服务实现
- **当** 改为直接调用目标服务函数
- **则** 输入参数与返回结果保持一致
- **并且** 对外日志与状态更新语义不变

## Out of Scope

- 跨模块契约字段或错误码重定义
- 功能扩展型重构（超出死代码与噪声清理）
