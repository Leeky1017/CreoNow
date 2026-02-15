## 1. Implementation

- [x] 1.1 新增 trace persistence migration（`generation_traces` / `trace_feedback`）并注册到 DB init
- [x] 1.2 实现 `traceStore`（trace 落盘、feedback 关联写入、runId→traceId 查询）
- [x] 1.3 接入 `aiService.runSkill` 成功路径 trace 持久化与结构化降级信号
- [x] 1.4 接入 `aiService.feedback` 的 trace feedback 关联写入
- [x] 1.5 在 `ipc/ai.ts` 注入 sqlite `traceStore` 到 AI service

## 2. Testing

- [x] 2.1 S3-TRACE-S1 Red：`traceStore.test.ts` 先失败（缺失模块）
- [x] 2.2 S3-TRACE-S2 Red：`traceStore.feedback.test.ts` 先失败（缺失模块）
- [x] 2.3 S3-TRACE-S3 Red：`aiService.trace-persistence.test.ts` 先失败（缺失降级信号）
- [x] 2.4 Green：S1/S2/S3 聚焦测试通过
- [x] 2.5 受影响 AI/IPC 聚焦回归通过

## 3. Governance

- [x] 3.1 新建并校验 Rulebook task `issue-559-s3-trace-persistence`
- [x] 3.2 更新 `openspec/_ops/task_runs/ISSUE-559.md`（Dependency Sync + Red/Green 证据）
- [x] 3.3 更新 `openspec/changes/s3-trace-persistence/tasks.md` 全部勾选
- [x] 3.4 提交并推送 `task/559-s3-trace-persistence`（不创建 PR）
