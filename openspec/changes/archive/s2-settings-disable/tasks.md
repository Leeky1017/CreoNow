## 1. Specification

- [x] 1.1 审阅 `docs/plans/unified-roadmap.md` 中 `s2-settings-disable（A1-H-001）` 的问题定义与验收边界
- [x] 1.2 审阅 `openspec/specs/workbench/spec.md`，确认仅下线未实现入口，不新增账户能力
- [x] 1.3 审阅/补充 `openspec/changes/s2-settings-disable/specs/workbench-delta.md`，确认 Requirement 与 Scenario 可直接映射测试
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；无依赖则标注 N/A

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个 UI 行为测试
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

## 3. Red（先写失败测试）

- [x] 3.1 编写账户入口禁用态失败测试
- [x] 3.2 编写禁用态点击不触发回调失败测试
- [x] 3.3 运行目标测试并记录 Red 证据

## 4. Green（最小实现通过）

- [x] 4.1 为账户入口添加 `disabled` 与提示信息，让 Red 转绿
- [x] 4.2 保持设置页其余行为不变

## 5. Refactor（保持绿灯）

- [x] 5.1 去重禁用态文案与判定逻辑
- [x] 5.2 复跑测试，确认无误触发路径

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG
