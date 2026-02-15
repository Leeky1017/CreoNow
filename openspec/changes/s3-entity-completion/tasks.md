## 1. Specification

- [ ] 1.1 审阅并确认 `s3-entity-completion` 边界：仅新增编辑器实体补全交互，不扩展编辑器其他能力。
- [ ] 1.2 审阅并确认错误与边界路径：无结果、查询失败、光标迁移异常均需可验证。
- [ ] 1.3 审阅并确认验收阈值：补全插入行为稳定且不破坏现有输入/保存链路。
- [ ] 1.4 完成依赖同步检查（Dependency Sync Check）并记录结论（本 change 预期 `NO_DRIFT`）。

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [ ] 2.2 为每个测试标注 Scenario ID，建立可追踪关系。
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

- [ ] `S3-EC-S1`：`apps/desktop/renderer/src/features/editor/__tests__/entity-completion.trigger.test.tsx` → `shows entity candidates when prefix is detected`
- [ ] `S3-EC-S2`：`apps/desktop/renderer/src/features/editor/__tests__/entity-completion.insert.test.tsx` → `inserts selected entity and keeps cursor continuity`
- [ ] `S3-EC-S3`：`apps/desktop/renderer/src/features/editor/__tests__/entity-completion.empty-state.test.tsx` → `shows deterministic empty/error state when no candidate is available`

## 3. Red（先写失败测试）

- [ ] 3.1 新增 `S3-EC-S1` 失败测试，验证当前缺少实体前缀触发补全能力。
- [ ] 3.2 新增 `S3-EC-S2` 失败测试，验证插入后光标与状态约束。
- [ ] 3.3 新增 `S3-EC-S3` 失败测试，验证无结果/异常提示路径。
- [ ] 3.4 运行最小测试集并记录 Red 证据（命令 + 失败输出）。

## 4. Green（最小实现通过）

- [ ] 4.1 落地实体补全最小交互（触发、候选列表、确认插入），使 `S3-EC-S1/S2/S3` 转绿。
- [ ] 4.2 对齐编辑器状态管理与提示文案约定，保持现有输入链路不变。
- [ ] 4.3 复跑 Scenario 对应测试并确认通过。

## 5. Refactor（保持绿灯）

- [ ] 5.1 去重候选映射与渲染逻辑，保持组件职责清晰。
- [ ] 5.2 对齐 Editor feature 目录结构与命名，避免风格漂移。
- [ ] 5.3 回归受影响编辑器测试，确认无行为回归。

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）。
- [ ] 6.2 记录依赖同步检查（Dependency Sync Check）输入、核对项、结论与后续动作。
- [ ] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG。
