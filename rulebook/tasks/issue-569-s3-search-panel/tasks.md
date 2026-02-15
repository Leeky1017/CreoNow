## 1. Implementation

- [x] 1.1 在 `SearchPanel` 增加结果项稳定标识（用于顺序与点击目标验证）
- [x] 1.2 保持查询结果渲染链路，完成 S3-SEARCH-PANEL-S1（查询→结果列表）
- [x] 1.3 完成结果点击跳转链路验证与对齐，覆盖 S3-SEARCH-PANEL-S2
- [x] 1.4 增加错误态与重试入口（`clearError + runFulltext`），覆盖 S3-SEARCH-PANEL-S3

## 2. Testing

- [x] 2.1 新增 S1 Red 测试：`search-panel-query.test.tsx`
- [x] 2.2 新增 S2 Red 测试：`search-panel-navigation.test.tsx`
- [x] 2.3 新增 S3 Red 测试：`search-panel-status.test.tsx`
- [x] 2.4 Green 后复跑 S1/S2/S3 聚焦测试通过

## 3. Governance

- [x] 3.1 更新 `openspec/changes/s3-search-panel/tasks.md`（含 Dependency Sync Check 勾选）
- [x] 3.2 更新 `openspec/_ops/task_runs/ISSUE-569.md`（Red/Green/验证证据）
- [x] 3.3 运行 `rulebook task validate issue-569-s3-search-panel` 并记录结果
