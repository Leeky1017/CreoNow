## 1. Specification

- [ ] 1.1 审阅 `docs/plans/unified-roadmap.md` 中 `s1-scheduler-error-ctx（A3-H-001 + A6-M-004）` 的问题定义、边界与验收目标。
- [ ] 1.2 审阅 `openspec/specs/skill-system/spec.md` 中调度失败处理与可观测性约束，确认本 change 仅覆盖 scheduler 错误上下文与终态一致性。
- [ ] 1.3 审阅并确认 `openspec/changes/s1-scheduler-error-ctx/specs/skill-system-delta.md` 的 Requirement 与 Scenario 可直接映射测试。
- [ ] 1.4 完成依赖同步检查（Dependency Sync Check）并记录结论（本 change 无上游依赖，预期 `NO_DRIFT`）。

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个失败测试（response/completion 错误上下文保留、终态一致性、日志字段完整性）。
- [ ] 2.2 为每个测试用例标注 Scenario ID（S1-SEC-S1/S2/S3），建立可追踪关系。
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

| Scenario ID | 测试文件                                                                 | 测试名称（拟定）                                                | 断言要点                                                                   |
| ----------- | ------------------------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| S1-SEC-S1   | `apps/desktop/main/src/services/skills/__tests__/skillScheduler.test.ts` | `preserves response/completion error context in failed path`    | `response`/`completion` 任一路径失败时，终态为 `failed` 且错误上下文可追踪 |
| S1-SEC-S2   | `apps/desktop/main/src/services/skills/__tests__/skillScheduler.test.ts` | `finalizes task terminal state exactly once across async races` | 双路径竞态下任务只收敛一次终态，不出现重复 finalize 或状态回写漂移         |
| S1-SEC-S3   | `apps/desktop/main/src/services/skills/__tests__/skillScheduler.test.ts` | `emits complete scheduler error log fields`                     | `skill_response_error` / `skill_completion_error` 日志包含必需字段集合     |

## 3. Red（先写失败测试）

- [ ] 3.1 编写 S1-SEC-S1 失败测试：模拟 `response` 与 `completion` 各自 rejection，验证当前实现存在错误上下文丢失。
- [ ] 3.2 编写 S1-SEC-S2 失败测试：模拟 `response` 与 `completion` 竞态，验证当前实现存在终态不一致或重复 finalize 风险。
- [ ] 3.3 编写 S1-SEC-S3 失败测试：验证日志字段缺失时断言失败。
- [ ] 3.4 运行 `pnpm exec tsx apps/desktop/main/src/services/skills/__tests__/skillScheduler.test.ts` 并记录 Red 证据。

## 4. Green（最小实现通过）

- [ ] 4.1 仅实现让 S1-SEC-S1/S2/S3 转绿的最小改动，补齐 `response`/`completion` 错误上下文保留。
- [ ] 4.2 在 scheduler 终态收敛路径加入一致性保护，确保单任务终态只写入一次。
- [ ] 4.3 统一 `skill_response_error` / `skill_completion_error` 日志字段，满足最小完备性要求。
- [ ] 4.4 复跑映射测试并确认全部 Green。

## 5. Refactor（保持绿灯）

- [ ] 5.1 去重 response/completion 错误组装与日志写入逻辑，避免双路径重复实现。
- [ ] 5.2 保持调度器对外行为契约不变（并发策略、队列策略、错误码集合不变）。
- [ ] 5.3 复跑受影响回归测试，确认无行为回归。

## 6. Evidence

- [ ] 6.1 在 RUN_LOG 记录 Red/Green 关键命令、输出与结论。
- [ ] 6.2 在 RUN_LOG 记录 依赖同步检查（Dependency Sync Check） 的输入、核对项与结论（`NO_DRIFT` 或 `DRIFT` 更新动作）。
- [ ] 6.3 在 RUN_LOG 记录日志字段完整性与终态一致性验证证据。
