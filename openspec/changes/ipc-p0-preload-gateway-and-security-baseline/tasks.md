## 0. 审阅状态

- Owner 审阅：`APPROVED`（2026-02-07）

## 1. Specification

- [x] 1.1 审阅并确认 preload 白名单通道策略
- [x] 1.2 审阅并确认 payload、订阅、push 速率的硬阈值与错误码
- [x] 1.3 审阅并确认安全审计日志最小字段集（`rendererId`、`channel`、`timestamp`）

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现
- 映射：
  - Scenario「调用未暴露通道被网关拒绝」→ `apps/desktop/tests/unit/ipc-preload-security.spec.ts`（S1）
  - Scenario「超大 payload 被拒绝并阻断业务处理」→ `apps/desktop/tests/unit/ipc-preload-security.spec.ts`（S3）
  - Scenario「订阅数量超过上限被拒绝」→ `apps/desktop/tests/unit/ipc-preload-security.spec.ts`（S4）
  - Scenario「事件风暴触发背压且保留关键事件」→ `apps/desktop/tests/unit/ipc-push-backpressure.spec.ts`

## 3. Red（先写失败测试）

- [x] 3.1 写“未授权通道返回 IPC_CHANNEL_FORBIDDEN”失败测试并确认先失败
- [x] 3.2 写“超大 payload 返回 IPC_PAYLOAD_TOO_LARGE”失败测试并确认先失败
- [x] 3.3 写“超订阅返回 IPC_SUBSCRIPTION_LIMIT_EXCEEDED”失败测试并确认先失败

## 4. Green（最小实现通过）

- [x] 4.1 在 preload 实现统一网关，拒绝未暴露通道
- [x] 4.2 增加 payload 大小与订阅数量限制
- [x] 4.3 增加 push 背压策略与审计日志，使 Red 用例转绿

## 5. Refactor（保持绿灯）

- [x] 5.1 收敛网关与限流代码重复，保持测试全绿
- [x] 5.2 保持错误码与审计字段契约不变

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（包含 Red 失败证据、Green 通过证据与命令输出）
