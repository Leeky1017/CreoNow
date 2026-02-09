## 1. Specification

- [x] 1.1 明确本 change 边界：开发分支支持失败后自动修复与自动提交，CI 保持只校验
- [x] 1.2 明确分类语义：新增候选 vs 实现对齐修复 vs 安全清理
- [x] 1.3 明确自动提交约束：仅 `task/<N>-<slug>` 分支允许 `--commit`
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录；本 change 依赖 issue-328 门禁能力，已执行并记录

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [x] S1 `缺失 expected 项必须归类为实现对齐修复 [ADDED]`
  - 测试：`apps/desktop/tests/unit/cross-module-contract-autofix.spec.ts`
  - 用例：`should classify missing expected channel as implementation alignment required`
- [x] S2 `出现未登记新增项必须归类为新增候选 [ADDED]`
  - 测试：`apps/desktop/tests/unit/cross-module-contract-autofix.spec.ts`
  - 用例：`should classify unexpected channel/error code as new contract addition candidate`
- [x] S3 `陈旧漂移自动清理并可通过门禁 [ADDED]`
  - 测试：`apps/desktop/tests/unit/cross-module-contract-autofix.spec.ts`
  - 用例：`should remove stale approved drift entries during autofix apply`
- [x] S4 `开发分支启用 --commit 自动提交 [ADDED]`
  - 测试：`apps/desktop/tests/unit/cross-module-contract-autofix.spec.ts`
  - 用例：`should create commit when apply+commit is enabled on task branch`
- [x] S5 `无可自动修复项时不得伪提交 [ADDED]`
  - 测试：`apps/desktop/tests/unit/cross-module-contract-autofix.spec.ts`
  - 用例：`should fail without commit when no safe fixes are available`
- [x] S6 `CI 仍只执行 check 不执行 autofix [ADDED]`
  - 测试：`apps/desktop/tests/unit/cross-module-contract-autofix.spec.ts`
  - 用例：`should keep ci wiring check-only without autofix step`

## 3. Red（先写失败测试）

- [x] 3.1 先写分类测试并确认 Red
- [x] 3.2 先写自动清理测试并确认 Red
- [x] 3.3 先写自动提交测试并确认 Red

## 4. Green（最小实现通过）

- [x] 4.1 扩展 gate 结果结构，输出可判定分类
- [x] 4.2 新增 `cross-module:autofix` 实现安全自动修复与可选自动提交
- [x] 4.3 接入 `package.json` 与使用文档

## 5. Refactor（保持绿灯）

- [x] 5.1 统一分类输出格式，稳定日志可读性
- [x] 5.2 收敛文件写入与 git 提交流程，避免误提交

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（Red/Green 证据、分类输出证据、自动提交证据）
- [x] 6.2 记录 Dependency Sync Check（核对 issue-328 门禁行为与本 change 分类语义一致）
- [ ] 6.3 等待 PR required checks 全绿后完成收口（auto-merge）
