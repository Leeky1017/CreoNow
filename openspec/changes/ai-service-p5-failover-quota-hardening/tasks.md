## 1. Specification

- [ ] 1.1 审阅主备切换、half-open 与 traceId 审计连续性规则
- [ ] 1.2 审阅预算/限流阈值与阻断错误码映射
- [ ] 1.3 审阅异常矩阵与 NFR 场景绑定（并发入队、容量上限）
- [ ] 1.4 依赖同步检查（Dependency Sync Check）：依赖 `ai-service-p0/p1/p3/p4`；结论 `NO_DRIFT`
- [ ] 1.5 Out-of-scope 确认：不做 UI 重设计，不新增 provider 类型

## 2. TDD Mapping（先测前提）

- [ ] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [ ] 2.1 S1「主备切换与 half-open 探测闭环」→ `apps/desktop/main/src/services/ai/__tests__/provider-failover-half-open.test.ts`
- [ ] 2.2 S2「会话预算与速率限制双阈值阻断」→ `apps/desktop/main/src/services/ai/__tests__/quota-rate-limit-guard.test.ts`
- [ ] 2.3 S3「全 provider 不可用进入降级态」→ `apps/desktop/tests/integration/ai-provider-unavailable-degrade.test.ts`
- [ ] 2.4 S4「降级恢复后审计链路连续」→ `apps/desktop/main/src/services/ai/__tests__/trace-audit-continuity.test.ts`
- [ ] 2.5 S5「同会话并发入队遵循单执行上限」→ `apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
- [ ] 2.6 S6「会话消息容量超限被阻断且不丢失历史」→ `apps/desktop/tests/integration/ai-chat-capacity-guard.test.ts`

### Scenario → Test 映射

- [ ] S1「主备切换与 half-open 探测闭环」→ `apps/desktop/main/src/services/ai/__tests__/provider-failover-half-open.test.ts`
- [ ] S2「会话预算与速率限制双阈值阻断」→ `apps/desktop/main/src/services/ai/__tests__/quota-rate-limit-guard.test.ts`
- [ ] S3「全 provider 不可用进入降级态」→ `apps/desktop/tests/integration/ai-provider-unavailable-degrade.test.ts`
- [ ] S4「降级恢复后审计链路连续」→ `apps/desktop/main/src/services/ai/__tests__/trace-audit-continuity.test.ts`
- [ ] S5「同会话并发入队遵循单执行上限」→ `apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
- [ ] S6「会话消息容量超限被阻断且不丢失历史」→ `apps/desktop/tests/integration/ai-chat-capacity-guard.test.ts`

## 3. Red（先写失败测试）

- [ ] 3.1 先写 S1/S2 失败测试（无切换闭环或阈值阻断不正确）
- [ ] 3.2 先写 S3/S4 失败测试（降级态/恢复审计不满足）
- [ ] 3.3 先写 S5/S6 失败测试（并发与容量边界未达标）
- [ ] 3.4 记录 Red 失败输出与关键日志至 RUN_LOG

## 4. Green（最小实现通过）

- [ ] 4.1 最小实现 provider 状态机与 half-open 探测
- [ ] 4.2 最小实现预算/限流守卫与错误码返回
- [ ] 4.3 最小实现全 provider 降级态与恢复审计
- [ ] 4.4 最小实现同会话排队与消息容量阻断

## 5. Refactor（保持绿灯）

- [ ] 5.1 收敛 provider 健康状态与审计记录抽象
- [ ] 5.2 去重配额与限流校验路径，保持外部契约不变
- [ ] 5.3 全量回归保持绿灯

## 6. Evidence

- [ ] 6.1 RUN_LOG 记录 Red/Green 证据（命令、输出、断言）
- [ ] 6.2 记录 依赖同步检查（Dependency Sync Check）（数据结构/IPC/错误码/阈值）= `NO_DRIFT`
- [ ] 6.3 记录 NFR 场景验证证据（并发入队、消息容量上限）
