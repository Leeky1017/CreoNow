## 1. Specification

- [x] 1.1 审阅并确认需求边界（聚焦：关键 panel/store 异步状态收敛）
- [x] 1.2 审阅并确认错误路径与边界路径
- [x] 1.3 审阅并确认验收阈值与不可变契约
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；无依赖则标注 N/A（本 change 依赖：aud-c1a-renderer-safeinvoke-contract）

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario -> Test 映射

| Scenario ID     | 测试文件                                                               | 计划用例名 / 断言块（若为脚本断言则 N/A） |
| -------------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| WB-AUD-C1B-S2  | `apps/desktop/renderer/src/stores/__tests__/aiStore.async-convergence.test.ts` | `WB-AUD-C1B-S2 converges refreshSkills to error when invoke throws` |
| WB-AUD-C1B-S2  | `apps/desktop/renderer/src/features/ai/__tests__/models-loading-convergence.test.tsx` | `WB-AUD-C1B-S2 should not keep model picker in Loading when refresh throws` |

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

- 输入：`openspec/changes/aud-c1a-renderer-safeinvoke-contract/specs/workbench/spec.md`、`openspec/changes/aud-c1a-renderer-safeinvoke-contract/tasks.md`、`apps/desktop/renderer/src/lib/ipcClient.ts`
- 结论：无漂移；本次 c1b/h4 在 safeInvoke 基线之上补齐 panel/store 状态收敛与失败重试。
- 后续动作：按 TDD 新增 `aiStore.async-convergence`、`models-loading-convergence`、`judge-auto-eval-retry-safety` 三条回归测试并通过。
