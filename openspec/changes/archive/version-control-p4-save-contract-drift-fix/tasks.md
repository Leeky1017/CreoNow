## 1. Specification

- [x] 1.1 审阅并确认需求边界
- [x] 1.2 审阅并确认错误路径与边界路径
- [x] 1.3 审阅并确认验收阈值与不可变契约
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；无依赖则标注 N/A

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

## 3. Red（先写失败测试）

- [x] 3.1 编写 Happy Path 的失败测试并确认先失败
- [x] 3.2 编写 Edge Case 的失败测试并确认先失败
- [x] 3.3 编写 Error Path 的失败测试并确认先失败

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 Red 转绿的最小代码
- [x] 4.2 逐条使失败测试通过，不引入无关功能

## 5. Refactor（保持绿灯）

- [x] 5.1 去重与重构，保持测试全绿
- [x] 5.2 不改变已通过的外部行为契约

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）

## Scenario → 测试映射

- S1 `file:document:save returns compaction payload without validation rejection`
  - `apps/desktop/tests/unit/document-ipc-contract.test.ts` 新增断言 `file:document:save.response.compaction`（Red: 字段缺失失败；Green: 字段存在通过）
- S2 `Contract regression guard for save compaction field`
  - `apps/desktop/tests/unit/document-ipc-contract.test.ts` 契约守卫断言

## 依赖同步检查（Dependency Sync Check）

- 输入：
  - `openspec/specs/ipc/spec.md`
  - `openspec/specs/version-control/spec.md`
  - `apps/desktop/main/src/services/documents/documentService.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- 核对：
  - 数据结构：仅响应字段对齐，无 DB schema 变化
  - IPC 契约：`file:document:save` 响应需覆盖 `compaction` 可选字段
  - 错误码：不新增错误码
  - 阈值：沿用既有 p4 阈值（2MB diff，50000 snapshot）
- 结论：`NO_DRIFT`
