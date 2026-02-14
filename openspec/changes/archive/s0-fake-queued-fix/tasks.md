## 1. Specification

- [x] 1.1 审阅并确认需求边界：仅修正空内容识别返回语义，不扩展队列能力
- [x] 1.2 审阅并确认错误路径：空内容不得伪造 `queued`/伪造 `taskId`
- [x] 1.3 审阅并确认验收阈值：空内容返回 `status: "skipped"` 且 `taskId: null`
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；本 change 为独立项，结论 `N/A（无上游依赖）`

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

- [x] S1 `空内容请求返回 skipped 且 taskId 为 null [ADDED]`
  - 测试文件：`apps/desktop/tests/unit/kg/recognition-empty-content-skip.test.ts`
  - 测试名：`"empty content returns skipped, not queued"`
- [x] S2 `空内容分支不触发可取消任务语义 [ADDED]`
  - 测试文件：`apps/desktop/tests/unit/kg/recognition-empty-content-skip.test.ts`
  - 测试名：`"empty content result is non-trackable when taskId is null"`

## 3. Red（先写失败测试）

- [x] 3.1 新增 `S1` 对应失败测试并确认当前实现返回 `queued` 导致断言失败
- [x] 3.2 新增 `S2` 对应失败测试并确认当前实现仍暴露可追踪任务语义
- [x] 3.3 运行 `pnpm exec tsx apps/desktop/tests/unit/kg/recognition-empty-content-skip.test.ts` 记录 Red 证据

## 4. Green（最小实现通过）

- [x] 4.1 修改 `apps/desktop/main/src/services/kg/kgRecognitionRuntime.ts` 空内容分支：返回 `status: "skipped"` 与 `taskId: null`
- [x] 4.2 逐条使 `S1/S2` 失败测试转绿，不引入额外功能分支

## 5. Refactor（保持绿灯）

- [x] 5.1 清理与 `queued` 语义耦合的局部分支，保持行为一致
- [x] 5.2 保持 `enqueueRecognition` 对外契约清晰：空内容=跳过且不可追踪

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG
