## 1. Implementation

- [x] 1.1 准入：确认 OPEN issue #483，创建 `task/483-p1-aistore-messages` worktree，并建立 Rulebook task
- [x] 1.2 完成依赖同步检查（上游 `p1-assemble-prompt`）并记录 `NO_DRIFT`
- [x] 1.3 先测后改：新增 Red 失败测试（metadata 防御性拷贝）后执行最小实现修复
- [x] 1.4 完成 change 文档收口：`tasks.md` 六段证据、RUN_LOG 落盘、change 归档与执行顺序同步

## 2. Testing

- [x] 2.1 Red：`pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts`（失败）
- [x] 2.2 Green：`pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/chatMessageManager.test.ts`（通过）
- [x] 2.3 回归：`pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/buildLLMMessages.test.ts`（通过）

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-483.md`，记录依赖核对/Red/Green/证据
- [ ] 3.2 提交 PR（`Closes #483`）+ auto-merge + main 收口 + Rulebook 自归档
