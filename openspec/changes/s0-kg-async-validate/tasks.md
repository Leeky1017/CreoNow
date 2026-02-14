## 1. Specification

- [ ] 1.1 审阅并确认需求边界（仅限 KnowledgeGraphPanel 异步写入结果校验与批量处理；不得扩展为架构重构）
- [ ] 1.2 审阅并确认错误路径与边界路径（ok:false、reject、部分失败、重复点击触发并发）
- [ ] 1.3 审阅并确认验收阈值与不可变契约（失败不得当作成功；编辑态/偏好保存/批量更新必须可判定）
- [ ] 1.4 依赖同步检查（Dependency Sync Check）：依赖 `s0-metadata-failfast`；核对 `KnowledgeGraphPanel` 变更面（metadata fail-fast vs async 校验）与共享 helper 签名；结论：`NO_DRIFT`（进入 Red 前需在 RUN_LOG 记录核对输入与结论）

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现
- [ ] 2.4 Scenario→测试映射：`KG-S0-AV-S1` → `apps/desktop/renderer/src/features/kg/__tests__/kg-async-validation.test.tsx`（`"relationDelete failure does not clear editing state"`，覆盖 KnowledgeGraphPanel）
- [ ] 2.5 Scenario→测试映射：`KG-S0-AV-S2` → `apps/desktop/renderer/src/features/kg/__tests__/kg-async-validation.test.tsx`（`"entityUpdate failure does not save view preferences"`，覆盖 KnowledgeGraphPanel）
- [ ] 2.6 Scenario→测试映射：`KG-S0-AV-S3` → `apps/desktop/renderer/src/features/kg/__tests__/kg-async-validation.test.tsx`（`"batch entityUpdate partial failure reports errors"`，覆盖 KnowledgeGraphPanel）

## 3. Red（先写失败测试）

- [ ] 3.1 编写 Happy Path 的失败测试并确认先失败（ok:true 时保持既有成功路径行为不变）
- [ ] 3.2 编写 Edge Case 的失败测试并确认先失败（部分失败时成功项仍生效；失败数可见）
- [ ] 3.3 编写 Error Path 的失败测试并确认先失败（ok:false/reject 时不得清空 editing / 不得保存偏好 / 不得静默吞错）

## 4. Green（最小实现通过）

- [ ] 4.1 仅实现让 Red 转绿的最小代码（在调用点增加 `ok` 检查与最小错误处理）
- [ ] 4.2 逐条使失败测试通过，不引入无关功能

## 5. Refactor（保持绿灯）

- [ ] 5.1 去重与重构，保持测试全绿（统一处理 fulfilled-but-ok:false 与 rejected 的分支，避免重复逻辑）
- [ ] 5.2 不改变已通过的外部行为契约

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [ ] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）= `NO_DRIFT`（依赖 `s0-metadata-failfast`）
- [ ] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG
