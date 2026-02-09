## 1. Implementation
- [x] 1.1 将搜索 IPC 从 `search:fulltext:query` 收敛为 `search:fts:query`，并新增 `search:fts:reindex`
- [x] 1.2 扩展 FTS 响应结构（`results/total/hasMore/indexState` + `highlights/anchor`）
- [x] 1.3 在索引损坏路径触发自动 reindex 并返回 `indexState="rebuilding"`
- [x] 1.4 更新 renderer store + SearchPanel（点击跳转、短暂高亮反馈、空态/重建态可见）
- [x] 1.5 补齐 Storybook 三态命名（`WithResults` / `Empty` / `Loading`）

## 2. Testing
- [x] 2.1 Red：新增 SR1-R1-S1~S4 对应测试并获取失败证据
- [x] 2.2 Green：执行目标场景测试并全部通过
- [x] 2.3 回归：`pnpm test:integration` 通过（含新增 search 集成测试）

## 3. Documentation
- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-354.md` 记录 Red/Green 证据
- [x] 3.2 更新本任务 proposal/tasks 与 OpenSpec change 任务勾选
