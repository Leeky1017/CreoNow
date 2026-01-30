# P0-004: SQLite bootstrap + migrations + logs（Windows 可观测）

Status: pending

## Goal

在 Windows 上建立“可启动、可迁移、可诊断”的本地持久化底座：SQLite DB（`creonow.db`）+ migrations + 结构化日志（main.log）。E2E 必须断言 DB 与 logs 的证据，以满足 `CNWB-REQ-120` 的可观测门禁。

## Dependencies

- Spec: `../spec.md#cnwb-req-001`
- Spec: `../spec.md#cnwb-req-120`
- Design: `../design/10-windows-build-and-e2e.md`
- P0-001: `./P0-001-windows-ci-windows-e2e-build-artifacts.md`

## Expected File Changes

| 操作   | 文件路径                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------ |
| Add    | `apps/desktop/main/src/db/paths.ts`（userData dir + db path 计算；支持 `CREONOW_USER_DATA_DIR`） |
| Add    | `apps/desktop/main/src/db/init.ts`（open db + migrations + pragmas）                             |
| Add    | `apps/desktop/main/src/db/migrations/0001_init.sql`（最小表集合）                                |
| Add    | `apps/desktop/main/src/logging/logger.ts`（main.log 写入；结构化）                               |
| Add    | `apps/desktop/tests/e2e/db-bootstrap.spec.ts`（E2E：表存在断言）                                 |
| Update | `apps/desktop/main/src/index.ts`（启动时 ensure db + log ready）                                 |

## Acceptance Criteria

- [ ] DB 路径固定且可覆盖：
  - [ ] 默认：`app.getPath('userData')/data/creonow.db`
  - [ ] E2E：`CREONOW_USER_DATA_DIR` 覆盖生效
- [ ] migrations 机制：
  - [ ] 使用 schema_version（或等价）记录版本
  - [ ] 迁移失败必须返回可诊断错误（`DB_ERROR`）并写入 main.log
- [ ] 最小表集合存在（可随实现扩展，但不得少于）：
  - [ ] `projects`
  - [ ] `documents`
  - [ ] `document_versions`
  - [ ] `settings`
  - [ ] `skills`
  - [ ] `user_memory`
  - [ ] `kg_entities`
  - [ ] `kg_relations`
- [ ] main log 存在且可写：
  - [ ] 路径：`<userData>/logs/main.log`
  - [ ] 启动成功必须包含关键行：`db_ready`（或等价）

## Tests

- [ ] E2E（Windows）`db-bootstrap.spec.ts`：
  - [ ] 启动 app → 关闭 app
  - [ ] 断言：`creonow.db` 文件存在
  - [ ] 断言：关键表存在（查询 `sqlite_master`）
  - [ ] 断言：`main.log` 存在且非空

## Edge cases & Failure modes

- DB 被锁/不可写 → 返回 `DB_ERROR`（不崩溃）；UI 显示可读错误并给出“重试/重启/打开日志”指引
- migrations 半成功 → 必须事务化或具备可恢复策略（禁止 silent corruption）

## Observability

- `main.log` 必须记录：
  - `db_path`（相对/脱敏）
  - `schema_version`
  - `migration_applied`（版本号列表）
  - `migration_failed`（错误码 + message）
