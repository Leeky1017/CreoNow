## 1. Implementation

- [x] 1.1 新增 `stateExtractor`（LLM 结果 schema 校验 + 实体匹配 + `lastSeenState` 回写）
- [x] 1.2 实现未知角色跳过策略，不创建隐式实体
- [x] 1.3 集成章节完成触发链路（`file:document:updatestatus` -> chapter `final`）
- [x] 1.4 增加结构化降级信号与日志字段（timeout/invalid payload/failed）

## 2. Testing

- [x] 2.1 S3-STE-S1：`extracts state changes and updates matched entities`（Red→Green）
- [x] 2.2 S3-STE-S2：`skips unknown entities and emits structured warning`（Red→Green）
- [x] 2.3 S3-STE-S3：`chapter-complete flow degrades gracefully when extraction fails`（Red→Green）
- [x] 2.4 执行受影响回归：`kgWriteService.last-seen` / `kgEntity.compatibility` / `document-error-mapping`

## 3. Governance

- [x] 3.1 更新 `openspec/changes/s3-state-extraction/tasks.md` 勾选与 Dependency Sync Check 结论
- [x] 3.2 更新 RUN_LOG：`openspec/_ops/task_runs/ISSUE-564.md`（含 Dependency Sync + Red/Green + 验证证据）
- [ ] 3.3 Main Session Audit 签字提交（本次按任务约束不包含单独签字提交）
- [ ] 3.4 PR / auto-merge / main sync（按任务约束不执行）
