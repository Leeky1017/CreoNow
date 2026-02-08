## 1. Implementation
- [ ] 1.1 完成任务准入：OPEN Issue、Rulebook task、独立 worktree、依赖同步检查（PM-1 -> PM-2）
- [ ] 1.2 建立 PM2-S1~S10 的 Scenario→测试映射并设置 Red gate
- [ ] 1.3 落地主进程生命周期状态机与 `project:project:switch` / `project:lifecycle:{archive|restore|purge|get}` IPC
- [ ] 1.4 落地渲染层切换加载条与删除二次确认输入校验，并接入 store 调用链
- [ ] 1.5 保持既有 project IPC 对外契约稳定（兼容旧通道调用）

## 2. Testing
- [ ] 2.1 PM2-S1~S10 先写失败测试并记录 Red 证据（命令+关键输出）
- [ ] 2.2 仅以最小实现使新增测试转绿并记录 Green 证据
- [ ] 2.3 执行相关 unit/integration/renderer/perf 回归并记录阈值结果
- [ ] 2.4 运行 Rulebook validate 与 preflight，确保门禁一致性

## 3. Documentation
- [ ] 3.1 维护 `openspec/_ops/task_runs/ISSUE-307.md`（映射、依赖同步、Red/Green、PR、checks）
- [ ] 3.2 更新 `openspec/changes/project-management-p1-lifecycle-switch-delete/tasks.md` 完成勾选
- [ ] 3.3 完成交付后归档 change，并同步 `openspec/changes/EXECUTION_ORDER.md`
