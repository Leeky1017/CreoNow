## 1. Specification

- [ ] 1.1 审阅 `docs/plans/unified-roadmap.md` 中 `s2-dual-field-migrate（A2-M-002 + A2-M-003）` 的问题定义与验收边界
- [ ] 1.2 审阅 `openspec/specs/ipc/spec.md`，确认仅定义迁移兼容与弃用告警，不改通信模式
- [ ] 1.3 审阅/补充 `openspec/changes/s2-dual-field-migrate/specs/ipc-delta.md`，确认 Requirement 与 Scenario 可直接映射测试
- [ ] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；无依赖则标注 N/A

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个 IPC 处理测试
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

## 3. Red（先写失败测试）

- [ ] 3.1 编写仅新字段输入的失败测试（无告警）
- [ ] 3.2 编写旧字段输入的失败测试（必须产生 deprecated 告警）
- [ ] 3.3 运行目标测试并记录 Red 证据

## 4. Green（最小实现通过）

- [ ] 4.1 接入旧字段弃用告警与新字段优先规则，使 Red 转绿
- [ ] 4.2 保持现有通道接口和返回结构不变

## 5. Refactor（保持绿灯）

- [ ] 5.1 统一告警事件名和字段格式
- [ ] 5.2 复跑测试，确认兼容期行为稳定

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [ ] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [ ] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG
