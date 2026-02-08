## 1. Specification

- [ ] 1.1 审阅并确认 MS-4 覆盖 Requirement：隔离作用域 / 降级策略
- [ ] 1.2 审阅并确认清除粒度与二次确认规则
- [ ] 1.3 审阅并确认异常范围：未确认全量清除、蒸馏 IO 失败降级

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将作用域优先级与清除流程映射为可追踪测试
- [ ] 2.2 将四档降级策略映射为故障注入测试
- [ ] 2.3 明确门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [ ] MS4-R1-S1 → `apps/desktop/tests/integration/memory/scope-priority-project-over-global.test.ts`
- [ ] MS4-R1-S2 → `apps/desktop/tests/integration/memory/promote-project-rule.test.ts`
- [ ] MS4-R1-S3 → `apps/desktop/tests/integration/memory/clear-confirmation-flow.test.ts`
- [ ] MS4-R2-S1 → `apps/desktop/tests/integration/memory/degrade-vector-offline.test.ts`
- [ ] MS4-R2-S2 → `apps/desktop/tests/integration/memory/degrade-all-memory-unavailable.test.ts`
- [ ] MS4-X-S1 → `apps/desktop/tests/integration/memory/clear-all-confirm-required.test.ts`
- [ ] MS4-X-S2 → `apps/desktop/tests/integration/memory/degrade-on-distill-io-failure.test.ts`

## 3. Red（先写失败测试）

- [ ] 3.1 编写作用域优先级与提升流程失败测试
- [ ] 3.2 编写清除确认与拒绝路径失败测试
- [ ] 3.3 编写降级故障注入失败测试并记录 Red 证据

## 4. Green（最小实现通过）

- [ ] 4.1 实现作用域优先级与提升最小闭环
- [ ] 4.2 实现清除流程二次确认与 IPC 返回契约
- [ ] 4.3 实现四档降级策略最小分流逻辑

## 5. Refactor（保持绿灯）

- [ ] 5.1 抽离作用域决策器与降级策略决策器
- [ ] 5.2 统一降级事件日志和错误码映射
- [ ] 5.3 保持测试全绿并复核故障注入覆盖

## 6. Evidence

- [ ] 6.1 RUN_LOG 记录 Scenario 映射、Red 失败证据、Green 通过证据
- [ ] 6.2 记录故障注入与降级行为验证输出
