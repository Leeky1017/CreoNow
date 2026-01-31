## 1. Implementation

- [x] 1.1 新增 main logger（`<userData>/logs/main.log`）并提供 `db_ready` 等关键证据行
- [x] 1.2 新增 DB paths + init（`<userData>/data/creonow.db` + migrations + pragmas）
- [x] 1.3 新增 `0001_init.sql`（最小表集合 + schema_version）
- [x] 1.4 更新 main 启动流程：启动时 ensure log + db ready（失败可诊断且不 silent）
- [x] 1.5 新增 E2E：断言 db 文件 + 关键表 + main.log 证据

## 2. Testing

- [x] 2.1 本地：`pnpm -C apps/desktop test:e2e`（含 `db-bootstrap.spec.ts`）
- [ ] 2.2 CI：windows-e2e/windows-build 全绿

## 3. Documentation

- [x] 3.1 新增 `openspec/_ops/task_runs/ISSUE-21.md` 并持续追加 Runs（只追加不回写）
- [x] 3.2 补齐 spec delta 并保持 `rulebook task validate` 通过
