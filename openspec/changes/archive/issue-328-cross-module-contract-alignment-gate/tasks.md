## 1. Specification

- [x] 1.1 审阅并确认本 change 的边界：实现“长期生效”的 cross-module 自动门禁，而非一次性人工核查
- [x] 1.2 审阅并确认漂移治理策略：未显式登记的漂移必须失败；已登记漂移可临时放行
- [x] 1.3 审阅并确认验收阈值：本地 preflight + CI 均执行 `cross-module:check`
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；本 change 依赖 issue-326 结论，已执行并记录

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [x] S1 `已登记漂移可通过 [ADDED]`
  - 测试：`apps/desktop/tests/unit/cross-module-contract-gate.spec.ts`
  - 用例：`should pass when drift is explicitly declared in baseline`
- [x] S2 `未登记漂移必须失败 [ADDED]`
  - 测试：`apps/desktop/tests/unit/cross-module-contract-gate.spec.ts`
  - 用例：`should fail when expected channel is missing without approved drift`
- [x] S3 `漂移条目陈旧必须失败 [ADDED]`
  - 测试：`apps/desktop/tests/unit/cross-module-contract-gate.spec.ts`
  - 用例：`should fail when approved drift becomes stale`
- [x] S4 `CI 与 preflight 必须执行 cross-module:check [ADDED]`
  - 测试：`apps/desktop/tests/unit/cross-module-contract-gate.spec.ts`
  - 用例：`should expose script and gate wiring contract for ci/preflight invocation`

## 3. Red（先写失败测试）

- [x] 3.1 先写“未登记漂移失败”测试并确认 Red
- [x] 3.2 先写“漂移陈旧失败”测试并确认 Red
- [x] 3.3 先写“CI/preflight 接线存在性”测试并确认 Red

## 4. Green（最小实现通过）

- [x] 4.1 增加 cross-module baseline 与检查脚本，使 Red 转绿
- [x] 4.2 接入 `package.json`、`ci.yml`、`agent_pr_preflight.py` 最小门禁闭环

## 5. Refactor（保持绿灯）

- [x] 5.1 收敛脚本错误输出格式，确保定位信息稳定
- [x] 5.2 保持对外门禁名称不变（仍由 `ci` 聚合）

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（Red 失败证据、Green 通过证据、CI 接线证据）
- [x] 6.2 记录 Dependency Sync Check（核对 issue-326 delta 结论与当前门禁基线一致）
- [ ] 6.3 等待 PR required checks 全绿后完成收口（auto-merge）
