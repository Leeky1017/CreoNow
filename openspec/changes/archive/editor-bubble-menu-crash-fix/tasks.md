## 1. Specification

- [x] 1.1 审阅 `openspec/specs/editor/spec.md` 与 `openspec/specs/ai-service/spec.md`，确认行为边界
- [x] 1.2 审阅并确认崩溃路径（AI apply success/conflict）与边界路径（选区折叠、Code Block）
- [x] 1.3 审阅并确认不可变契约：BubbleMenu 显隐语义与 AI apply 行为不变
- [x] 1.4 上游依赖检查：N/A（本修复为 Editor 内部实现策略调整）

## 2. TDD Mapping（先测前提）

- [x] 2.1 S1「AI apply success 不触发渲染崩溃」→ `apps/desktop/tests/e2e/ai-apply.spec.ts`
- [x] 2.2 S2「AI apply conflict 不触发渲染崩溃且保留冲突保护」→ `apps/desktop/tests/e2e/ai-apply.spec.ts`
- [x] 2.3 设定门禁：先记录 Red 失败，再进入实现

## 3. Red（先写失败测试）

- [x] 3.1 运行 `pnpm -C apps/desktop test:e2e -- tests/e2e/ai-apply.spec.ts` 并确认失败
- [x] 3.2 记录失败现象：success 路径缺失 `ai-apply-status`，conflict 路径 `ai-apply` 超时
- [x] 3.3 将 Red 失败证据写入 `openspec/_ops/task_runs/ISSUE-408.md`

## 4. Green（最小实现通过）

- [x] 4.1 在 `EditorBubbleMenu` 中改为稳定挂载 `BubbleMenu`
- [x] 4.2 使用 `shouldShow` 控制显隐，避免卸载竞态
- [x] 4.3 保持 Vitest runtime 的测试渲染分支行为

## 5. Refactor（保持绿灯）

- [x] 5.1 最小注释说明挂载策略变更原因
- [x] 5.2 回归并确认既有行为契约不变

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（Red 失败、Green 通过、门禁输出）
- [x] 6.2 记录合并证据（PR、auto-merge、main 收口）
