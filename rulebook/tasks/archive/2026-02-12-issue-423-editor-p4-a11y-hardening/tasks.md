## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #423 + `task/423-editor-p4-a11y-hardening` worktree
- [x] 1.2 Rulebook task 创建并首次 `validate` 通过
- [x] 1.3 Dependency Sync Check：核对 `editor-p0~p3`（数据结构、IPC 契约、错误码、阈值）并落盘
- [x] 1.4 Red：完成 8 个 p4 场景失败测试证据（a11y/冲突/竞态/容量/粘贴/重算/性能）
- [x] 1.5 Green：实现保存队列优先级、容量上限提示、超大粘贴分块与确认、重算取消闭环
- [x] 1.6 Refactor：统一 aria 属性构造与编辑器边界守卫，保持行为不变

## 2. Testing

- [x] 2.1 运行 Editor p4 目标测试（Red→Green）
- [x] 2.2 运行 `pnpm typecheck`
- [x] 2.3 运行 `pnpm lint`
- [x] 2.4 运行 `pnpm contract:check`
- [x] 2.5 运行 `pnpm cross-module:check`
- [x] 2.6 运行 `pnpm test:unit`
- [x] 2.7 运行 `scripts/agent_pr_preflight.sh`

## 3. Documentation

- [x] 3.1 维护 `openspec/_ops/task_runs/ISSUE-423.md`（准入、Dependency Sync、Red/Green、门禁、合并证据）
- [x] 3.2 完成并归档 `openspec/changes/editor-p4-a11y-hardening`，同步 `openspec/changes/EXECUTION_ORDER.md`
- [x] 3.3 按同 PR 自归档规则归档 `rulebook/tasks/issue-423-editor-p4-a11y-hardening`
