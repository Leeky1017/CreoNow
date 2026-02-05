# Design 05 — Test Strategy & CI Gate（测试策略与门禁）

> Spec: `../spec.md#cnmvp-req-005`
>
> Related cards:
> - `../task_cards/p0/P0-005-ci-run-desktop-vitest.md`
> - `../task_cards/p1/P1-002-core-services-unit-tests.md`
> - `../task_cards/p1/P1-003-core-stores-tests.md`

本文件写死“怎么测、测什么、门禁跑什么命令”，避免出现“写了测试但 CI 不跑”的假安全感。

## 1) 测试分层

### 1.1 Unit（Node/TS 脚本）

- 位置：`apps/desktop/tests/unit/*`
- 运行方式：root `pnpm test:unit`
- 用途：main/service 纯逻辑、contract/codegen、diff、redaction 等

### 1.2 Integration（Node/TS 脚本）

- 位置：`apps/desktop/tests/integration/*`
- 运行方式：root `pnpm test:integration`
- 用途：SQLite roundtrip、FTS、RAG retrieve 等

### 1.3 Component/Store（Vitest + jsdom）

- 位置：`apps/desktop/renderer/src/**/*.test.{ts,tsx}`
- 运行方式：`pnpm -C apps/desktop test:run`
- 用途：renderer primitives/patterns、stores、container 逻辑、dialog 交互

### 1.4 E2E（Playwright Electron）

- 位置：`apps/desktop/tests/e2e/*`
- 运行方式：`pnpm -C apps/desktop test:e2e`（Windows CI 已覆盖）
- 用途：关键用户路径的门禁（Dashboard 操作、Version restore 等）

## 2) CI 门禁（写死）

`.github/workflows/ci.yml` 的 `check` job 必须包含（顺序可调整）：

- `pnpm typecheck`
- `pnpm lint`
- `pnpm contract:check`
- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm -C apps/desktop test:run`  ← 本 spec 新增的门禁

## 3) 证据口径（RUN_LOG）

任何会改变验收结论的命令都必须写入 RUN_LOG（只摘关键输出）：

- `pnpm -C apps/desktop test:run`
- `pnpm test:unit`
- `pnpm test:integration`
- 对应任务卡的 E2E 命令（若新增/更新）

