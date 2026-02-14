## 1. Specification

- [ ] 1.1 审阅 `docs/plans/unified-roadmap.md` 中 `s2-type-convergence（A1-H-002）` 的问题定义与验收边界
- [ ] 1.2 审阅 `openspec/specs/version-control/spec.md`，确认仅收敛类型单源，不改变功能行为
- [ ] 1.3 审阅/补充 `openspec/changes/s2-type-convergence/specs/version-control-delta.md`，确认 Requirement 与 Scenario 可直接映射测试
- [ ] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；无依赖则标注 N/A

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试/静态校验用例
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

## 3. Red（先写失败测试）

- [ ] 3.1 编写类型重复定义检测用例（或静态断言）并确认失败
- [ ] 3.2 编写类型来源收敛验证用例并确认失败
- [ ] 3.3 运行 `pnpm tsc --noEmit` 相关路径并记录 Red 证据

## 4. Green（最小实现通过）

- [ ] 4.1 移除本地重复类型定义并改为单一来源导入
- [ ] 4.2 仅做类型收敛最小改动，不触碰行为逻辑

## 5. Refactor（保持绿灯）

- [ ] 5.1 清理冗余类型别名/注释，保持声明清晰
- [ ] 5.2 复跑类型检查并确认全绿

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [ ] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [ ] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG
