## 1. Specification

- [x] 1.1 审阅流式协议字段：`executionId`、`traceId`、chunk 序号、done 终态
- [x] 1.2 确认状态机定义与终态不可逆规则
- [x] 1.3 锁定网络中断后的重试语义（完整 prompt 重放）
- [x] 1.4 依赖同步检查（Dependency Sync Check）：依赖 `ai-service-p0-llmproxy-config-security`；结论 `NO_DRIFT`
- [x] 1.5 Out-of-scope 确认：不触及聊天持久化与 Judge

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 S1「流式生命周期可判定闭环」→ `apps/desktop/tests/integration/ai-stream-lifecycle.test.ts`
- [x] 2.2 S2「取消与完成并发时取消优先」→ `apps/desktop/tests/integration/ai-stream-race-cancel-priority.test.ts`
- [x] 2.3 为 `skill:stream:*` 事件顺序与终态建立断言模板
- [x] 2.4 未出现 Red 失败证据不得进入实现

### Scenario → Test 映射

- [x] S1「流式生命周期可判定闭环」→ `apps/desktop/tests/integration/ai-stream-lifecycle.test.ts`
- [x] S2「取消与完成并发时取消优先」→ `apps/desktop/tests/integration/ai-stream-race-cancel-priority.test.ts`

## 3. Red（先写失败测试）

- [x] 3.1 编写并运行 S1 失败测试（缺失 done 收敛或事件序列错乱）
- [x] 3.2 编写并运行 S2 失败测试（竞态下终态非 cancelled）
- [x] 3.3 记录网络中断重试语义不一致的失败证据
- [x] 3.4 失败命令与日志写入 RUN_LOG

## 4. Green（最小实现通过）

- [x] 4.1 最小实现流式生命周期状态机与事件收敛
- [x] 4.2 最小实现取消优先竞态裁决
- [x] 4.3 最小实现网络中断后的完整 prompt 重试路径
- [x] 4.4 仅覆盖本 change 目标，不引入聊天/Judge 逻辑

## 5. Refactor（保持绿灯）

- [x] 5.1 抽离状态机纯函数，降低 IPC 层分支复杂度
- [x] 5.2 保持 `skill:stream:*` 协议稳定，不新增未审批字段
- [x] 5.3 回归测试保持全绿

## 6. Evidence

- [x] 6.1 RUN_LOG 记录 Red/Green 证据与事件时序日志
- [x] 6.2 记录 依赖同步检查（Dependency Sync Check）（数据结构/IPC/错误码/阈值）= `NO_DRIFT`
- [x] 6.3 记录竞态优先级验证截图或日志片段
