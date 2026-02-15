## 1. Implementation

- [x] 1.1 新增 `synopsisStore`（SQLite）并提供 upsert/list 接口
- [x] 1.2 新增 `synopsisFetcher`，按章节顺序注入前几章摘要
- [x] 1.3 在 `layerAssemblyService` 注册 synopsis 注入路径并保持四层契约不变
- [x] 1.4 新增 `0022_s3_synopsis_injection.sql` 并在 `db/init.ts` 接入 migration
- [x] 1.5 在 `ipc/context.ts` 注入 synopsis store 依赖

## 2. Testing

- [x] 2.1 S3-SYN-INJ-S1 Red→Green：`synopsisFetcher.test.ts`
- [x] 2.2 S3-SYN-INJ-S2 Red→Green：`layerAssemblyService.synopsis.test.ts`
- [x] 2.3 S3-SYN-INJ-S3 Red→Green：`synopsisStore.error-path.test.ts`
- [x] 2.4 受影响上下文回归测试通过（contract/dependency/context unit）

## 3. Documentation

- [x] 3.1 更新 `openspec/changes/s3-synopsis-injection/proposal.md`（Dependency Sync Check）
- [x] 3.2 更新 `openspec/changes/s3-synopsis-injection/tasks.md`（TDD + 证据勾选）
- [x] 3.3 新建并更新 `openspec/_ops/task_runs/ISSUE-565.md`
- [ ] 3.4 完成本任务 commit + push（不创建 PR）
