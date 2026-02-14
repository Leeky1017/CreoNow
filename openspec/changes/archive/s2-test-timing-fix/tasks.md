## 1. Specification

- [x] 1.1 审阅并确认需求边界：仅替换异步测试等待机制，不改生产逻辑
- [x] 1.2 审阅并确认错误路径与边界路径：防止固定 sleep 掩盖真实失败
- [x] 1.3 审阅并确认验收阈值：移除 `setTimeout(resolve, ...)` 依赖并保持测试可重复通过
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；本 change 标注为独立项

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

| Scenario ID     | 测试文件                              | 测试名称（拟定）                                      | 断言要点                           |
| --------------- | ------------------------------------- | ----------------------------------------------------- | ---------------------------------- |
| `CMI-S2-TTF-S1` | `apps/desktop/**/__tests__/*.test.ts` | `replaces sleep-based async wait with condition wait` | 条件未满足时测试失败，满足后通过   |
| `CMI-S2-TTF-S2` | `apps/desktop/**/__tests__/*.test.ts` | `avoids flaky pass caused by fixed timeout`           | 不依赖固定时长，结果由行为条件决定 |

## 3. Red（先写失败测试）

- [x] 3.1 为 `CMI-S2-TTF-S1` 编写失败测试，先证明固定 sleep 无法可靠表达条件达成
- [x] 3.2 为 `CMI-S2-TTF-S2` 编写失败测试，先证明旧模式存在“到时即过”的风险
- [x] 3.3 运行对应测试并记录 Red 证据（失败输出与 Scenario ID 对应）

Red 证据：

- `pnpm exec tsx apps/desktop/tests/unit/s2-test-timing-fix.guard.test.ts`（失败，命中 14 个目标文件共 22 处 `setTimeout(resolve, <ms>)`）

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 `CMI-S2-TTF-S1/S2` 转绿的最小改动（替换等待方式）
- [x] 4.2 逐文件验证改造后测试通过，不引入无关断言与逻辑

## 5. Refactor（保持绿灯）

- [x] 5.1 统一等待模式命名与结构，减少同类测试写法漂移
- [x] 5.2 保持行为断言清晰，避免重新引入隐式时间假设

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG

Green 证据：

- `pnpm exec tsx apps/desktop/tests/unit/s2-test-timing-fix.guard.test.ts`（通过）
- `pnpm exec tsx apps/desktop/main/src/services/skills/__tests__/skillScheduler.test.ts`（通过）
- `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts`（通过）
- `pnpm exec tsx apps/desktop/tests/integration/ai-skill-context-integration.test.ts`（通过）
- `pnpm exec tsx apps/desktop/tests/integration/ai-stream-lifecycle.test.ts`（通过）
- `pnpm exec tsx apps/desktop/tests/integration/ai-stream-race-cancel-priority.test.ts`（通过）
- `pnpm exec tsx apps/desktop/tests/integration/skill-session-queue-limit.test.ts`（通过）
- `pnpm exec tsx apps/desktop/tests/integration/kg/recognition-queue-cancel.test.ts`（通过）
- `pnpm exec tsx apps/desktop/tests/integration/kg/recognition-backpressure.test.ts`（通过）
- `pnpm exec tsx apps/desktop/tests/integration/kg/recognition-query-failure-degrade.test.ts`（通过）
- `pnpm exec tsx apps/desktop/tests/unit/kg/recognition-silent-degrade.test.ts`（通过）
- `pnpm exec tsx apps/desktop/tests/unit/kg/kg-recognition-runtime-metrics-split.test.ts`（通过）
- `pnpm exec tsx apps/desktop/tests/unit/main/index.app-ready-catch.test.ts`（通过）
- `pnpm -C apps/desktop exec vitest run src/components/layout/AppShell.test.tsx src/features/editor/EditorPane.test.tsx`（通过，39 tests）
