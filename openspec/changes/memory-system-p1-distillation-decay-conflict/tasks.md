## 1. Specification

- [ ] 1.1 审阅并确认 MS-2 覆盖 Requirement：蒸馏 / 衰减 / 冲突
- [ ] 1.2 审阅并确认蒸馏触发条件、衰减公式、压缩策略
- [ ] 1.3 审阅并确认异常范围：并发冲突、置信度越界

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 MS2-R1/MS2-R2/MS2-R3/MS2-X 场景映射到单测与集成测
- [ ] 2.2 为每个测试标注 Scenario ID 并建立可追踪关系
- [ ] 2.3 明确门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [ ] MS2-R1-S1 → `apps/desktop/tests/integration/memory/distill-trigger-batch.test.ts`
- [ ] MS2-R1-S2 → `apps/desktop/tests/unit/memory/distill-rule-generation.test.ts`
- [ ] MS2-R1-S3 → `apps/desktop/tests/unit/memory/distill-llm-fallback.test.ts`
- [ ] MS2-R2-S1 → `apps/desktop/tests/unit/memory/decay-lifecycle.test.ts`
- [ ] MS2-R2-S2 → `apps/desktop/tests/unit/memory/decay-reactivation.test.ts`
- [ ] MS2-R2-S3 → `apps/desktop/tests/unit/memory/decay-immune-confirmed-rule.test.ts`
- [ ] MS2-R3-S1 → `apps/desktop/tests/unit/memory/conflict-time-shift.test.ts`
- [ ] MS2-R3-S2 → `apps/desktop/tests/integration/memory/conflict-user-resolution-queue.test.ts`
- [ ] MS2-X-S1 → `apps/desktop/tests/integration/memory/distill-write-concurrency.test.ts`
- [ ] MS2-X-S2 → `apps/desktop/tests/unit/memory/confidence-validation.test.ts`

## 3. Red（先写失败测试）

- [ ] 3.1 编写蒸馏触发与 LLM 异常路径失败测试
- [ ] 3.2 编写衰减公式纯函数失败测试（含边界值）
- [ ] 3.3 编写冲突处理与并发冲突失败测试并记录 Red 证据

## 4. Green（最小实现通过）

- [ ] 4.1 实现最小蒸馏管线和 IPC 契约使 Red 转绿
- [ ] 4.2 实现衰减纯函数与压缩状态流转
- [ ] 4.3 实现冲突检测与用户确认队列最小闭环

## 5. Refactor（保持绿灯）

- [ ] 5.1 抽离蒸馏管线步骤与共享校验逻辑
- [ ] 5.2 统一错误码与并发控制策略（快照/WAL）
- [ ] 5.3 保持测试全绿并复核性能/稳定性指标

## 6. Evidence

- [ ] 6.1 在 RUN_LOG 记录 Scenario 映射、Red 失败输出、Green 通过输出
- [ ] 6.2 记录 mock LLM 调用证据与并发冲突复现实验结果
