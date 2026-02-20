## 1. Specification

- [x] 1.1 审阅并确认需求边界（聚焦：纳入 main/src 与 tests/unit 漏执行测试）
- [x] 1.2 审阅并确认错误路径与边界路径
- [x] 1.3 审阅并确认验收阈值与不可变契约
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；无依赖则标注 N/A（本 change 依赖：aud-c2a-test-runner-discovery）

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario -> Test 映射

| Scenario ID     | 测试文件                                               | 计划用例名 / 断言块（若为脚本断言则 N/A） |
| -------------- | ------------------------------------------------------ | ---------------------------------------- |
| CMI-AUD-C2B-S1 | `apps/desktop/tests/unit/test-runner-discovery.spec.ts` | `S3: unit discovery must include desktop unit + main source tests`（注释） |
| CMI-AUD-C2B-S2 | `apps/desktop/tests/unit/test-runner-discovery.spec.ts` | `S4: discovery runner must expose import-safe execution plan...`（注释） |

## 3. Red（先写失败测试）

- [x] 3.1 编写 Happy Path 的失败测试并确认先失败
- [x] 3.2 编写 Edge Case 的失败测试并确认先失败
- [x] 3.3 编写 Error Path 的失败测试并确认先失败

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 Red 转绿的最小代码
- [x] 4.2 逐条使失败测试通过，不引入无关功能

## 5. Refactor（保持绿灯）

- [x] 5.1 去重与重构，保持测试全绿
- [x] 5.2 不改变已通过的外部行为契约

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG

Evidence pointers（Wave1）：

- RUN_LOG：`openspec/_ops/task_runs/ISSUE-591.md`
  - Red/Green：见 `## Runs`（Wave1 Verification Gates / Targeted Regression Pack）
  - 6.3 Main Session Audit：见 `## Main Session Audit`
- PR：https://github.com/Leeky1017/CreoNow/pull/592

Dependency Sync Check 记录（2026-02-16）：

- 输入：`openspec/changes/aud-c2a-test-runner-discovery/specs/cross-module-integration-spec/spec.md`、`openspec/changes/aud-c2a-test-runner-discovery/tasks.md`、`package.json`、`scripts/run-discovered-tests.ts`
- 结论：无漂移；本次 c2b 在 c2a 的发现式执行基线之上补齐“可导入执行计划 + 套件纳入/执行守护测试”，未引入契约冲突
- 后续动作：按 TDD 完成 `apps/desktop/tests/unit/test-runner-discovery.spec.ts` Red→Green，并保持 `test:unit` 入口不变
