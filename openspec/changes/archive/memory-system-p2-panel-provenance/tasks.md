## 1. Specification

- [x] 1.1 审阅并确认 MS-3 覆盖 Requirement：面板交互 / 溯源
- [x] 1.2 审阅并确认 5 种操作、Storybook 4 态、设计 token 约束
- [x] 1.3 审阅并确认异常范围：trace 失配、跨项目读取
- [x] 1.4 在进入 Red 前完成依赖同步检查（Dependency Sync Check）：核对 MS-2 已合并产出的语义记忆 CRUD/蒸馏进度/冲突输出与本 change 假设（结论：`NO_DRIFT`）

## 2. TDD Mapping（先测前提）

- [x] 2.1 建立面板行为场景到组件测试映射（Scenario ID 可追踪）
- [x] 2.2 建立溯源 IPC 场景到集成测试映射
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [x] MS3-R1-S1 → `apps/desktop/renderer/src/features/memory/__tests__/memory-panel-confirm.test.tsx`
- [x] MS3-R1-S2 → `apps/desktop/renderer/src/features/memory/__tests__/memory-panel-edit.test.tsx`
- [x] MS3-R1-S3 → `apps/desktop/renderer/src/features/memory/__tests__/memory-panel-delete.test.tsx`
- [x] MS3-R1-S4 → `apps/desktop/renderer/src/features/memory/__tests__/memory-panel-manual-add-empty-state.test.tsx`
- [x] MS3-R1-S5 → `apps/desktop/renderer/src/features/memory/__tests__/memory-panel-pause-learning.test.tsx`
- [x] MS3-R2-S1 → `apps/desktop/tests/integration/memory/trace-get-display.test.ts`
- [x] MS3-R2-S2 → `apps/desktop/tests/integration/memory/trace-feedback.test.ts`
- [x] MS3-X-S1 → `apps/desktop/tests/integration/memory/trace-mismatch-error.test.ts`
- [x] MS3-X-S2 → `apps/desktop/tests/integration/memory/trace-cross-project-deny.test.ts`

## 3. Red（先写失败测试）

- [x] 3.1 编写面板 5 操作失败测试并确认先失败
- [x] 3.2 编写溯源查询/反馈失败测试并确认先失败
- [x] 3.3 编写异常路径失败测试（trace 失配、跨项目）并记录 Red 证据

## 4. Green（最小实现通过）

- [x] 4.1 实现 Memory Panel 最小交互闭环与 IPC 对接
- [x] 4.2 实现 GenerationTrace 查询与反馈链路
- [x] 4.3 实现 Storybook 4 态并保证测试转绿

## 5. Refactor（保持绿灯）

- [x] 5.1 抽离面板交互状态与展示组件，减少耦合
- [x] 5.2 统一权限校验与错误提示映射
- [x] 5.3 复核设计 token 使用一致性并保持测试全绿

## 6. Evidence

- [x] 6.1 RUN_LOG 记录 Scenario 映射、Red 失败输出、Green 通过输出
- [x] 6.2 记录 Storybook 构建与权限异常验证证据
- [x] 6.3 记录 Dependency Sync Check 的输入、结论（无漂移/已更新）与后续动作
