## 1. Implementation

- [x] 1.1 完成任务准入：OPEN Issue、Rulebook task、独立 worktree、Dependency Sync Check 记录
- [x] 1.2 新增 KG3 IPC handlers 与 `KgRecognitionRuntime` 接线（主进程 + autosave 异步触发）
- [x] 1.3 落地 `query:relevant` / `query:byids` / `rules:inject` 与跨项目阻断、失败降级
- [x] 1.4 更新 IPC contract / generated types / error code 并保持 runtime-validation 可通过

## 2. Testing

- [x] 2.1 建立 KG3-R1/R2/A/X Scenario→测试映射并先拿到 Red 失败证据
- [x] 2.2 让新增 11 个 KG3 测试转绿，并纳入根脚本 `test:unit` / `test:integration`
- [x] 2.3 运行 `typecheck`、`lint`、`test:unit`、`test:integration`、`contract:generate` 验证回归

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-321.md` 记录 Red/Green/门禁与交付证据
- [x] 3.2 完成 change tasks 勾选并归档 `knowledge-graph-p2-auto-recognition-ai-utilization`
- [x] 3.3 同步更新 `openspec/changes/EXECUTION_ORDER.md`（活跃变更数量/顺序）
