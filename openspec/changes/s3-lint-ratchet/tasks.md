## 1. Specification

- [ ] 1.1 审阅并确认 `docs/plans/unified-roadmap.md` 中 `s3-lint-ratchet` 的目标边界（违规数不回升）
- [ ] 1.2 审阅并确认 `openspec/specs/cross-module-integration-spec.md` 的门禁阻断与契约稳定要求
- [ ] 1.3 审阅并确认 `openspec/changes/s3-lint-ratchet/specs/cross-module-integration-delta.md` 的 Requirement/Scenario 可直接映射测试
- [ ] 1.4 完成依赖同步检查（Dependency Sync Check）并记录结论（本 change 预期 `NO_DRIFT`）

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个失败测试
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

- [ ] CMI-S3-LR-S1 → `scripts/tests/lint-ratchet-baseline.test.ts`（基线快照结构与读取语义）
- [ ] CMI-S3-LR-S2 → `scripts/tests/lint-ratchet-regression.test.ts`（新增违规触发阻断）
- [ ] CMI-S3-LR-S3 → `scripts/tests/lint-ratchet-cross-session-guard.test.ts`（跨会话基线更新防线）

## 3. Red（先写失败测试）

- [ ] 3.1 编写 `CMI-S3-LR-S1` 失败测试，先证明基线快照缺失或字段不完整会导致不可比对
- [ ] 3.2 编写 `CMI-S3-LR-S2` 失败测试，先证明当前流程无法自动阻断新增违规
- [ ] 3.3 编写 `CMI-S3-LR-S3` 失败测试，先证明跨会话基线更新缺少约束时会产生回退风险
- [ ] 3.4 运行目标测试并记录 Red 证据（失败输出与 Scenario ID 对齐）

## 4. Green（最小实现通过）

- [ ] 4.1 增加/更新 lint 基线快照与 ratchet 比对逻辑，使 `CMI-S3-LR-S1~S3` 转绿
- [ ] 4.2 将 ratchet 校验接入 CI，确保新增违规在 PR 阶段自动失败
- [ ] 4.3 保持规则级差异输出可读，支持快速定位回退来源

## 5. Refactor（保持绿灯）

- [ ] 5.1 统一脚本输入输出协议，避免本地与 CI 口径分叉
- [ ] 5.2 收敛基线更新流程文档与注释，降低跨会话误操作概率
- [ ] 5.3 复跑脚本测试与 CI dry-run，确认 ratchet 稳定

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [ ] 6.2 记录依赖同步检查（Dependency Sync Check）输入、核对项、结论与后续动作（无漂移/已更新）
- [ ] 6.3 记录 lint baseline 版本、ratchet 对比结果与 CI 阻断证据，证明自动化防回退与跨会话防线生效
