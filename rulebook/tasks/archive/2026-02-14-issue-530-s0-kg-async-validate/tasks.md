## 1. Implementation

- [x] 1.1 在 `KnowledgeGraphPanel` 为 `relationDelete`/`entityUpdate` 增加 `ok:false/reject` 防护，失败中止后续成功路径
- [x] 1.2 将 timeline 批量更新切换为 `Promise.allSettled`，并实现部分失败计数与日志输出
- [x] 1.3 新增 `shouldClearRelationEditingAfterDelete` 判定函数，确保删除失败不清空 relation 编辑态

## 2. Testing

- [x] 2.1 新增 `kg-async-validation.test.tsx`，映射 `KG-S0-AV-S1/S2/S3` 并先 Red 后 Green
- [x] 2.2 运行 KG 最小回归集，确认 metadata fail-fast 与渲染路径无回归

## 3. Documentation

- [x] 3.1 更新 `openspec/changes/s0-kg-async-validate/tasks.md`（含 Dependency Sync Check 与证据）
- [x] 3.2 更新 `openspec/_ops/task_runs/ISSUE-530.md`，记录 Red/Green/验证命令
- [x] 3.3 归档 change 并同步 `openspec/changes/EXECUTION_ORDER.md`
