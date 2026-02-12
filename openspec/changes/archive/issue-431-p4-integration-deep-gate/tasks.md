## 1. Specification

- [x] 1.1 审阅并确认本次范围为 P4 归档后集成门禁复核
- [x] 1.2 审阅并确认失败分类规则（实现对齐/新增契约候选/安全清理）
- [x] 1.3 审阅并确认门禁命令顺序与验收阈值
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）：核对 P4 已归档产物与当前基线（数据结构、IPC 契约、错误码、阈值）

## 2. TDD Mapping（先测前提）

- [x] 2.1 将本 change 的每个 Scenario 映射到至少一个测试或门禁用例
- [x] 2.2 为修复项建立 Scenario ID → 测试用例映射
- [x] 2.3 设定门禁：未出现 Red（失败证据）不得进入实现

### Scenario → Test 映射

- [x] S1 `固定顺序门禁执行并记录结果 [ADDED]`
  - 用例：`pnpm typecheck`, `pnpm lint`, `pnpm contract:check`, `pnpm cross-module:check`, `pnpm test:unit`, `pnpm test:integration`
- [x] S2 `失败项按三分类输出 [ADDED]`
  - 用例：`pnpm cross-module:check` + 失败日志分类（若失败）
- [x] S3 `修复项具备 Red/Green 闭环证据 [ADDED]`
  - 用例：修复项失败测试（Red）→ 最小实现（Green）→ 回归门禁
- [x] S4 `test:integration 覆盖 P4 关键集成用例 [ADDED]`
  - 用例：`apps/desktop/tests/unit/p4-integration-gate-coverage.spec.ts`

## 3. Red（先写失败测试）

- [x] 3.1 对首个失败项编写并验证失败测试（Happy Path）
- [x] 3.2 对边界失败项编写并验证失败测试（Edge Case，N/A：本次缺口为门禁覆盖缺失）
- [x] 3.3 对错误路径失败项编写并验证失败测试（Error Path，N/A：本次缺口为门禁覆盖缺失）

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 Red 转绿的最小代码
- [x] 4.2 逐条使失败测试通过，不引入无关功能

## 5. Refactor（保持绿灯）

- [x] 5.1 在保持外部行为契约不变前提下去重与整理
- [x] 5.2 回归门禁保持全绿

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（命令、退出码、关键输出、证据路径）
- [x] 6.2 记录 Dependency Sync Check 输入、结论与后续动作
