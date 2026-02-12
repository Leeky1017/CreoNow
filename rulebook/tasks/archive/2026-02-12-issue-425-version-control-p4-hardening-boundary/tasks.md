## 1. Implementation

- [x] 1.1 在 `version.ts` 落地 document 级串行锁与回滚冲突返回（`VERSION_ROLLBACK_CONFLICT`）
- [x] 1.2 在 `documentService.ts` 落地快照容量压缩与超大 Diff 保护（`VERSION_SNAPSHOT_COMPACTED` / `VERSION_DIFF_PAYLOAD_TOO_LARGE`）
- [x] 1.3 在 `version.ts` 落地关键 IO 失败重试（3 次、5s 超时）
- [x] 1.4 更新 IPC contract 错误码集合与 `version:snapshot:create` schema

## 2. Testing

- [x] 2.1 Red：`apps/desktop/tests/unit/version-hardening-boundary.ipc.test.ts` 4 个场景先失败
- [x] 2.2 Green：P4 专项测试 + 既有 `version-diff-rollback` / `version-branch-merge-conflict` / `document-ipc-contract` 全部通过
- [x] 2.3 回归：`typecheck`、`lint`、`contract:check`、`cross-module:check`、`test:unit`、`pnpm -C apps/desktop test:run` 全绿

## 3. Documentation

- [x] 3.1 更新 `openspec/changes/version-control-p4-hardening-boundary/tasks.md`（Scenario 映射 + 勾选）
- [x] 3.2 维护 `openspec/_ops/task_runs/ISSUE-425.md`（Dependency Sync / Red / Green / 性能基准 / 门禁证据）
- [ ] 3.3 preflight + PR auto-merge + main 收口 + change/rulebook 归档
