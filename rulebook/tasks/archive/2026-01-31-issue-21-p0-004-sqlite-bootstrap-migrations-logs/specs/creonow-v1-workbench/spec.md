# Spec Delta: creonow-v1-workbench (ISSUE-21)

本任务实现 `P0-004`（SQLite bootstrap + migrations + logs），把 Windows-first 的“本地可持久化 + 可诊断证据”落成可执行门禁。

## Changes

- Add: DB 路径计算（`<userData>/data/creonow.db`，支持 `CREONOW_USER_DATA_DIR` 覆盖）。
- Add: migrations（schema_version + `0001_init.sql`）与最小表集合。
- Add: main process 日志（`<userData>/logs/main.log`），启动写入 `db_ready` 等关键行。
- Add: Windows Playwright E2E：断言 db/log 文件存在、关键表存在与日志证据。

## Acceptance

- E2E（Windows）能断言 db/log 证据，并用于后续 P0 卡的稳定回归。
