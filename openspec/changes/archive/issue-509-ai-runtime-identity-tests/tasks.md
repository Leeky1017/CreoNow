## 1. Specification

- [x] 1.1 审阅并确认需求边界：本变更仅覆盖 AI 运行时 prompt 组装接入与两项回归测试补齐
- [x] 1.2 审阅并确认错误路径与边界路径：stream timeout done 收敛、全层 fetcher 异常降级
- [x] 1.3 审阅并确认验收阈值与不可变契约：`skill:stream:done` 单次收敛、context assemble 不因单层/全层异常失败
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；无依赖则标注 N/A（本变更：N/A）

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID    | 测试文件                                                                   | 测试用例名（计划）                                                |
| -------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| AIS-RUNTIME-S1 | `apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts` | `runtime non-stream system prompt must include identity layer`    |
| AIS-RUNTIME-S2 | `apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts` | `runtime stream system prompt must include identity layer`        |
| AIS-TIMEOUT-S1 | `apps/desktop/tests/integration/ai-stream-lifecycle.test.ts`               | `AIS-TIMEOUT-S1: stream 超时通过 done(error: SKILL_TIMEOUT) 收敛` |
| CE-DEGRADE-S1  | `apps/desktop/tests/unit/context/layer-degrade-warning.test.ts`            | `CE-DEGRADE-S1 全层异常时继续组装并返回 warnings`                 |

## 3. Red（先写失败测试）

- [x] 3.1 编写 Happy Path 的失败测试并确认先失败（AIS-RUNTIME-S1）
- [x] 3.2 编写 Edge Case 的失败测试并确认先失败（AIS-RUNTIME-S2）
- [x] 3.3 编写 Error Path 回归测试并执行（AIS-TIMEOUT-S1 / CE-DEGRADE-S1；当前实现已满足，作为防回归）

Red 证据（AIS-RUNTIME-S1）：

```bash
$ pnpm tsx apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts
AssertionError [ERR_ASSERTION]: runtime non-stream system prompt must include identity layer
```

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 Red 转绿的最小代码
- [x] 4.2 逐条使失败测试通过，不引入无关功能

Green 证据：

```bash
$ pnpm tsx apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts
# exit 0
$ pnpm tsx apps/desktop/tests/integration/ai-stream-lifecycle.test.ts
# exit 0
$ pnpm tsx apps/desktop/tests/unit/context/layer-degrade-warning.test.ts
# exit 0
```

## 5. Refactor（保持绿灯）

- [x] 5.1 去重与重构，保持测试全绿
- [x] 5.2 不改变已通过的外部行为契约

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
