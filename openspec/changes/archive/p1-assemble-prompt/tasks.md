## 1. Specification

- [x] 1.1 审阅并确认需求边界：`assembleSystemPrompt` 接受 6 层参数，`globalIdentity` 为必选，其余可选
- [x] 1.2 审阅并确认错误路径与边界路径：空白字符串层被 `.trim()` 过滤；`globalIdentity` 为空白时按空层跳过且不产生占位分隔符
- [x] 1.3 审阅并确认验收阈值与不可变契约：6 层固定顺序不可变，各层以 `\n\n` 分隔
- [x] 1.4 上游依赖 `p1-identity-template`，已完成依赖同步检查（Dependency Sync Check）并落盘，结论：`NO_DRIFT`（`GLOBAL_IDENTITY_PROMPT` 为 string 常量）

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

| Scenario ID | 测试文件                                                                   | 测试用例名                                                       | 断言要点                                                                                                                         |
| ----------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| S1          | `apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts` | `should assemble all six layers in correct order`                | `indexOf("<identity>") < indexOf("规则") < indexOf("续写助手") < indexOf("Mode: agent") < indexOf("简洁风格") < indexOf("林默")` |
| S2          | `apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts` | `should return only identity when optional layers are undefined` | `expect(result).toBe("<identity>AI</identity>")`                                                                                 |
| S3          | `apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts` | `should skip whitespace-only layers`                             | `expect(result).toBe("<identity>AI</identity>")`，不含 `\n\n\n\n`                                                                |
| S4          | `apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts` | `should skip empty identity placeholder when identity is blank`  | `expect(result).toBe("Mode: agent")`，且不以 `\n\n` 开头                                                                         |

## 3. Red（先写失败测试）

- [x] 3.1 先补 S4 失败断言：当 `globalIdentity` 为空白且 `modeHint` 非空时，输出不得保留前导占位分隔符
- [x] 3.2 执行失败测试，确认失败源于实现缺口（非路径/环境错误）

```bash
$ pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected

+ '   \n\nMode: agent'
- 'Mode: agent'
```

Red 结论：失败与 S4 需求一致，可进入 Green。

## 4. Green（最小实现通过）

- [x] 4.1 最小实现：仅在 `assembleSystemPrompt` 内跳过空白 `globalIdentity`，避免前导占位分隔符
- [x] 4.2 重新执行目标测试并通过

```bash
$ pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts && \
  pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/identityPrompt.test.ts
# exit 0
```

Green 结论：S1/S2/S3/S4 覆盖通过，未引入 identity 相关回归。

## 5. Refactor（保持绿灯）

- [x] 5.1 保持实现最小化：未改动 `combineSystemText` 与其它调用链，仅收敛 `assembleSystemPrompt` 的空层处理
- [x] 5.2 同步更新 delta spec 与 Scenario 映射，确保规范与测试一致

## 6. Evidence

- [x] 6.1 OPEN Issue：`#477`（不复用已关闭 `#456`）
- [x] 6.2 Rulebook task：`rulebook/tasks/issue-477-p1-assemble-prompt/`
- [x] 6.3 RUN_LOG：`openspec/_ops/task_runs/ISSUE-477.md`
- [x] 6.4 关键命令输出已落盘（install / Red / Green / validate / preflight / auto-merge）
