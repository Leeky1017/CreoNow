## 1. Specification

- [ ] 1.1 审阅并确认 `docs/plans/unified-roadmap.md` 中 `s3-p3-backlog-batch` 的 14 个 P3 子项边界与验收口径
- [ ] 1.2 审阅并确认 `openspec/specs/cross-module-integration-spec.md` 的契约稳定约束（接口/错误码/IPC 语义不变）
- [ ] 1.3 审阅并确认 `openspec/changes/s3-p3-backlog-batch/specs/cross-module-integration-delta.md` 的 Requirement/Scenario 可直接映射测试
- [ ] 1.4 完成依赖同步检查（Dependency Sync Check）并记录结论（本 change 预期 `NO_DRIFT`）

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个失败测试
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

- [ ] CMI-S3-BB-S1 → `apps/desktop/tests/integration/sprint3/backlog-batch-coverage.test.ts`（14 子项映射完整性）
- [ ] CMI-S3-BB-S2 → `apps/desktop/tests/integration/sprint3/backlog-batch-contract-stability.test.ts`（跨模块契约不回退）
- [ ] CMI-S3-BB-S3 → `apps/desktop/tests/unit/sprint3/backlog-batch-recurrence-guards.test.ts`（低危复发防线）
- [ ] CMI-S3-BB-S4 → `apps/desktop/tests/integration/sprint3/backlog-batch-drift-guard.test.ts`（ADDONLY/NOISE/DRIFT 防回归）

## 3. Red（先写失败测试）

- [ ] 3.1 编写 `CMI-S3-BB-S1` 失败测试，先证明存在“子项未覆盖/不可追踪”风险
- [ ] 3.2 编写 `CMI-S3-BB-S2` 失败测试，先证明批处理改动可导致契约漂移
- [ ] 3.3 编写 `CMI-S3-BB-S3/S4` 失败测试，先证明复发防线与漂移防线尚未满足
- [ ] 3.4 运行目标测试并记录 Red 证据（失败输出与 Scenario ID 一一对应）

## 4. Green（最小实现通过）

- [ ] 4.1 按 14 子项逐文件实施最小修复，使 `CMI-S3-BB-S1~S4` 转绿
- [ ] 4.2 修复后保持“单一实现来源”，避免 ADDONLY 双路径并存
- [ ] 4.3 复跑目标测试并确认跨模块契约、复发防线与漂移防线全部通过

## 5. Refactor（保持绿灯）

- [ ] 5.1 统一批处理改动风格（命名、断言、清理策略），降低后续维护噪声
- [ ] 5.2 去除残留低价值噪声（含历史 TODO 占位）且保持审计可追溯
- [ ] 5.3 复跑受影响测试集，确认不引入新的 DRIFT/NOISE

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [ ] 6.2 记录依赖同步检查（Dependency Sync Check）输入、核对项、结论与后续动作（无漂移/已更新）
- [ ] 6.3 记录 14 子项“审计编号 -> 修复文件 -> 验证测试”对照证据，确保批处理可回溯
