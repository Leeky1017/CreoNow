## 1. Implementation
- [x] 1.1 落地分支模型与冲突会话迁移（`document_branches`、`document_merge_sessions`、`document_merge_conflicts`）
- [x] 1.2 落地分支 IPC 通道（`version:branch:create/list/switch/merge`、`version:conflict:resolve`）
- [x] 1.3 落地三方合并模块与超时保护（5s -> `VERSION_MERGE_TIMEOUT`）
- [x] 1.4 落地 renderer 分支冲突解决 UI（ours/theirs/manual）并接入 resolve IPC

## 2. Testing
- [x] 2.1 Red：验证 handler/contract/store/container 缺口触发失败
- [x] 2.2 Green：验证 IPC contract + unit + renderer 定向测试通过
- [x] 2.3 回归：`typecheck`、`lint`、`contract:check`、`cross-module:check`、`test:unit`、`apps/desktop test:run` 全部通过

## 3. Documentation
- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-414.md`（Dependency Sync Check、Red/Green、门禁输出）
- [x] 3.2 更新 `openspec/changes/version-control-p3-branch-merge-conflict/tasks.md` 勾选与 Scenario 映射
- [ ] 3.3 preflight + PR + auto-merge + main 收口 + change/rulebook 归档
