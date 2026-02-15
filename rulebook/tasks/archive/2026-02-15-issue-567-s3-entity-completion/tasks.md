## 1. Implementation

- [x] 1.1 在 `EditorPane` 实现实体前缀检测、候选查询、键盘导航与回车确认插入
- [x] 1.2 新增 `EntityCompletionPanel`（候选/空态/错误态）并接入编辑区渲染
- [x] 1.3 在 `editorStore` 增加实体补全会话状态与实体列表查询动作

## 2. Testing

- [x] 2.1 S3-EC-S1 Red/Green：`entity-completion.trigger.test.tsx`
- [x] 2.2 S3-EC-S2 Red/Green：`entity-completion.insert.test.tsx`
- [x] 2.3 S3-EC-S3 Red/Green：`entity-completion.empty-state.test.tsx`
- [x] 2.4 聚焦回归：`EditorPane.test.tsx` + 新增场景测试复跑全绿

## 3. Governance

- [x] 3.1 更新 `openspec/changes/s3-entity-completion/tasks.md`（含 Dependency Sync Check 与证据勾选）
- [x] 3.2 新建并更新 `openspec/_ops/task_runs/ISSUE-567.md`（Dependency Sync / Red / Green / Verification）
- [x] 3.3 执行 `rulebook task validate issue-567-s3-entity-completion`
- [x] 3.4 提交并推送 `task/567-s3-entity-completion`（不创建 PR）
