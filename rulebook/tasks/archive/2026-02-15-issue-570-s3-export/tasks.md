## 1. Implementation

- [x] 1.1 新增 S3-EXPORT-S1/S2 主进程导出场景测试（先 Red）
- [x] 1.2 新增 S3-EXPORT-S3 UI 失败可见性测试（先 Red）
- [x] 1.3 完成最小实现：Markdown/TXT 标题拼装 + ExportDialog 异常兜底

## 2. Testing

- [x] 2.1 执行 Red 失败验证（S1/S2/S3）
- [x] 2.2 执行 Green 验证（S1/S2/S3）
- [x] 2.3 执行最终聚焦验证（含 prettier / rulebook validate / 回归）

## 3. Documentation

- [x] 3.1 更新 `openspec/changes/s3-export/tasks.md`（TDD Mapping + Dependency Sync Check）
- [x] 3.2 更新 `openspec/_ops/task_runs/ISSUE-570.md`（命令证据与结论）
- [x] 3.3 commit + push `task/570-s3-export`（由总控 PR `#573` 统一完成 merge 收口）
