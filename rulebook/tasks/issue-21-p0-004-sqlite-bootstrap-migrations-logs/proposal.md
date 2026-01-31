# Proposal: issue-21-p0-004-sqlite-bootstrap-migrations-logs

## Why

为 CN Workbench 提供 Windows-first 可观测的本地持久化底座：SQLite DB（creonow.db）+ migrations + main.log。该底座是 project/documents/editor/ai/memory/kg/search 等所有 P0 功能的共同依赖，也为 Windows Playwright E2E 提供“可断言证据”（DB 文件/关键表/日志关键行），满足 `CNWB-REQ-120`。

## What Changes

- 新增 main process 结构化 logger：写入 `<userData>/logs/main.log`，包含 `db_ready` 等关键行。
- 新增 DB 路径与初始化：固定 `<userData>/data/creonow.db`，并支持 `CREONOW_USER_DATA_DIR` 覆盖 userData。
- 新增 migrations 机制（schema_version + SQL migrations）与最小表集合（projects/documents/document_versions/settings/skills/user_memory/kg_entities/kg_relations）。
- 新增 Windows Playwright Electron E2E：断言 DB 文件、关键表与 main.log 证据。

## Impact

- Affected specs:
  - `openspec/specs/creonow-v1-workbench/spec.md#cnwb-req-120`
  - `openspec/specs/creonow-v1-workbench/task_cards/p0/P0-004-sqlite-bootstrap-migrations-logs.md`
- Affected code:
  - `apps/desktop/main/src/db/**`
  - `apps/desktop/main/src/logging/**`
  - `apps/desktop/main/src/index.ts`
  - `apps/desktop/tests/e2e/db-bootstrap.spec.ts`
- Breaking change: NO
- User benefit: Windows 上可稳定创建/迁移/诊断本地 DB；E2E 有可回归的证据门禁，降低后续 P0 功能交付的 flake 与不可诊断失败。
