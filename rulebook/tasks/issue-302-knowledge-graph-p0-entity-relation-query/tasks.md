## 1. Implementation

- [x] 1.1 标记 `knowledge-graph-p0-entity-relation-query` 审批通过，并落盘依赖同步检查（Dependency Sync Check）
- [x] 1.2 在 KG 数据层实现实体/关系 schema、容量阈值、并发版本冲突与错误码映射
- [x] 1.3 在 IPC 层完成 `knowledge:entity:*`、`knowledge:relation:*`、`knowledge:query:*` 契约与 handler
- [x] 1.4 在渲染层同步 store/channel 与实体详情页 Storybook 3 态

## 2. Testing

- [x] 2.1 建立并执行 Scenario→测试映射，先产出 Red 失败证据再进入 Green
- [x] 2.2 运行并通过目标单测/集测/性能基线测试，记录阈值结果
- [x] 2.3 执行 `rulebook task validate issue-302-knowledge-graph-p0-entity-relation-query`
- [ ] 2.4 执行 `scripts/agent_pr_preflight.sh` 并修复阻断项至通过

## 3. Documentation

- [x] 3.1 维护 `openspec/_ops/task_runs/ISSUE-302.md`（Scenario 映射、Red/Green、门禁、PR）
- [ ] 3.2 回填 RUN_LOG PR 真实链接并记录 auto-merge + main 收口证据
- [ ] 3.3 更新本 task 状态并在交付完成后归档 Rulebook task
