## 1. Implementation

- [x] 1.1 完成 SR3 依赖同步核对并确认 `NO_DRIFT`（SR-1 / version-control / ipc）
- [x] 1.2 新增 SR3-R1-S1~S3 对应集成测试，先记录 Red 失败证据
- [x] 1.3 实现 `search:replace:preview`（范围+三开关解析、预览统计、items/warnings）
- [x] 1.4 实现 `search:replace:execute`（预览确认前置、替换执行与回执）
- [x] 1.5 实现 `wholeProject` 替换前逐文档快照（`reason=pre-search-replace`）与失败跳过
- [x] 1.6 更新 IPC contract 与共享类型生成物，保持契约/实现一致

## 2. Testing

- [x] 2.1 Red：`replace-current-document` / `replace-preview-confirm` / `replace-version-snapshot` 失败可复现
- [x] 2.2 Green：上述 3 个场景测试全部转绿
- [x] 2.3 回归：`pnpm typecheck`、`pnpm lint`、`pnpm contract:check`、`pnpm cross-module:check`、`pnpm test:unit`

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-368.md`（映射、Red/Green、关键命令与输出）
- [x] 3.2 完成 `openspec/changes/search-retrieval-p2-replace-versioned/tasks.md` 勾选与证据段
- [x] 3.3 完成 change 归档、`EXECUTION_ORDER.md` 同步、Rulebook task 自归档
