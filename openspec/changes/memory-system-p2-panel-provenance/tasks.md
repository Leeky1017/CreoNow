## 1. Specification

- [ ] 1.1 审阅并确认 MS-3 覆盖 Requirement：面板交互 / 溯源
- [ ] 1.2 审阅并确认 5 种操作、Storybook 4 态、设计 token 约束
- [ ] 1.3 审阅并确认异常范围：trace 失配、跨项目读取

## 2. TDD Mapping（先测前提）

- [ ] 2.1 建立面板行为场景到组件测试映射（Scenario ID 可追踪）
- [ ] 2.2 建立溯源 IPC 场景到集成测试映射
- [ ] 2.3 设定 Red 门禁：失败证据未记录不得进入 Green

### Scenario → Test 映射

- [ ] MS3-R1-S1 → `apps/desktop/renderer/src/features/memory/__tests__/memory-panel-confirm.test.tsx`
- [ ] MS3-R1-S2 → `apps/desktop/renderer/src/features/memory/__tests__/memory-panel-edit.test.tsx`
- [ ] MS3-R1-S3 → `apps/desktop/renderer/src/features/memory/__tests__/memory-panel-delete.test.tsx`
- [ ] MS3-R1-S4 → `apps/desktop/renderer/src/features/memory/__tests__/memory-panel-manual-add-empty-state.test.tsx`
- [ ] MS3-R1-S5 → `apps/desktop/renderer/src/features/memory/__tests__/memory-panel-pause-learning.test.tsx`
- [ ] MS3-R2-S1 → `apps/desktop/tests/integration/memory/trace-get-display.test.ts`
- [ ] MS3-R2-S2 → `apps/desktop/tests/integration/memory/trace-feedback.test.ts`
- [ ] MS3-X-S1 → `apps/desktop/tests/integration/memory/trace-mismatch-error.test.ts`
- [ ] MS3-X-S2 → `apps/desktop/tests/integration/memory/trace-cross-project-deny.test.ts`

## 3. Red（先写失败测试）

- [ ] 3.1 编写面板 5 操作失败测试并确认先失败
- [ ] 3.2 编写溯源查询/反馈失败测试并确认先失败
- [ ] 3.3 编写异常路径失败测试（trace 失配、跨项目）并记录 Red 证据

## 4. Green（最小实现通过）

- [ ] 4.1 实现 Memory Panel 最小交互闭环与 IPC 对接
- [ ] 4.2 实现 GenerationTrace 查询与反馈链路
- [ ] 4.3 实现 Storybook 4 态并保证测试转绿

## 5. Refactor（保持绿灯）

- [ ] 5.1 抽离面板交互状态与展示组件，减少耦合
- [ ] 5.2 统一权限校验与错误提示映射
- [ ] 5.3 复核设计 token 使用一致性并保持测试全绿

## 6. Evidence

- [ ] 6.1 RUN_LOG 记录 Scenario 映射、Red 失败输出、Green 通过输出
- [ ] 6.2 记录 Storybook 截图/快照与权限异常验证证据
