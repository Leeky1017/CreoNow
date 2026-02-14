## 1. Specification

- [x] 1.1 审阅 `docs/plans/unified-roadmap.md` 中 `s2-kg-metrics-split（A3-H-002）` 的问题定义与验收边界
- [x] 1.2 审阅 `openspec/specs/knowledge-graph/spec.md`，确认仅收敛 KG 运行时指标语义，不扩展识别能力
- [x] 1.3 审阅/补充 `openspec/changes/s2-kg-metrics-split/specs/knowledge-graph-delta.md`，确认 Requirement 与 Scenario 可直接映射测试
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；无依赖则标注 N/A

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

## 3. Red（先写失败测试）

- [x] 3.1 编写 KG 任务成功路径的失败测试，验证 `succeeded/completed` 计数
- [x] 3.2 编写 KG 任务失败路径的失败测试，验证 `failed` 增加且 `completed` 不变
- [x] 3.3 运行目标测试并记录 Red 证据

## 4. Green（最小实现通过）

- [x] 4.1 在 KG 运行时实现最小计数分支，让 Red 转绿
- [x] 4.2 保持现有外部行为不变，仅修正指标语义

## 5. Refactor（保持绿灯）

- [x] 5.1 去重计数更新逻辑，保持语义清晰且测试全绿
- [x] 5.2 复核成功/失败路径日志与计数字段一致性

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG
