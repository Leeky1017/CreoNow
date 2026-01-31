## 1. Implementation

- [x] 1.1 扩展 IPC contract + codegen（`project:*` + `context:creonow:*` 最小集）
- [x] 1.2 实现 ProjectService（SQLite：create/list/delete + current project setting）
- [x] 1.3 实现 `.creonow` ensure/status（FS 创建 + 可测存在性）
- [x] 1.4 main 注册 IPC handlers（显式注入 db/logger/userData）
- [x] 1.5 renderer：welcome-screen + create-project-dialog + projectStore
- [x] 1.6 E2E：`project-lifecycle.spec.ts`（create + ensure + restart restore）

## 2. Testing

- [x] 2.1 本地：`pnpm -C apps/desktop test:e2e`（含 `project-lifecycle.spec.ts`）
- [ ] 2.2 本地：`scripts/agent_pr_preflight.sh`

## 3. Documentation

- [x] 3.1 新增 `openspec/_ops/task_runs/ISSUE-25.md` 并持续追加 Runs（只追加不回写）
- [x] 3.2 补齐 spec delta 并保持 `rulebook task validate` 通过
