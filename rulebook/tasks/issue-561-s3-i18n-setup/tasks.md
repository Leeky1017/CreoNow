## 1. Implementation

- [x] 1.1 新增 `renderer/src/i18n/index.ts` 初始化入口（默认 `zh-CN`，回退 `en`）
- [x] 1.2 新增 locale skeleton：`zh-CN.json`、`en.json`
- [x] 1.3 在 `main.tsx` 接入 `I18nextProvider`
- [x] 1.4 在 App shell 文案入口改为 key 渲染路径（`workbench.export.currentDocument`）

## 2. Testing

- [x] 2.1 S3-I18N-SETUP-S1：初始化默认/回退语言测试（Red→Green）
- [x] 2.2 S3-I18N-SETUP-S2：缺失 key 可观测回退测试（Red→Green）
- [x] 2.3 S3-I18N-SETUP-S3：App shell key-render 启动路径测试（Red→Green）
- [x] 2.4 执行聚焦测试并记录证据

## 3. Governance

- [x] 3.1 更新 `openspec/changes/s3-i18n-setup/tasks.md` 勾选状态
- [x] 3.2 新建 RUN_LOG：`openspec/_ops/task_runs/ISSUE-561.md`（含 Dependency Sync + Red/Green 证据）
- [ ] 3.3 Main Session Audit 签字提交（本次按要求不包含）
- [ ] 3.4 PR / auto-merge / main sync（本次按要求不执行）
