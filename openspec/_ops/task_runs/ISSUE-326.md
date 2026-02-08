# ISSUE-326

- Issue: #326
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/326
- Branch: task/326-layer2-layer3-integration-gate
- PR: PENDING
- Scope: 对 Layer2（Document Management）与 Layer3（KG/PM/MS）执行里程碑集成检查，核对跨模块契约并输出 delta report
- Out of Scope: 运行时代码改动、IPC handler 重命名、数据库迁移

## Plan

- [x] 执行全量门禁命令并记录结果
- [x] 对照 `cross-module-integration-spec` 与 IPC 契约 SSOT 做差异核对
- [x] 输出 implemented / partial / missing 的 delta report
- [x] 补齐 OpenSpec change + Rulebook task + EXECUTION_ORDER
- [ ] 创建 PR、开启 auto-merge、等待 checks 全绿并收口

## Runs

### 2026-02-09 03:40 全量门禁首次执行（环境问题暴露）

- Command:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test:unit`
  - `pnpm -C apps/desktop test:run`
  - `pnpm test:integration`
  - `pnpm test:ipc:acceptance`
  - `pnpm contract:check`
  - `pnpm -C apps/desktop storybook:build`
  - `pnpm desktop:test:e2e`
- Exit code: `1`（首次）
- Key output:
  - 依赖缺失导致局部命令失败（`d3-force`、`d3-zoom` 解析异常）。
- Action:
  - 执行 `pnpm install --frozen-lockfile` 修复依赖后重跑。

### 2026-02-09 03:52 全量门禁复跑（修复后）

- Command:
  - `pnpm install --frozen-lockfile`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test:unit`
  - `pnpm -C apps/desktop test:run`
  - `pnpm test:integration`
  - `pnpm test:ipc:acceptance`
  - `pnpm contract:check`
  - `pnpm -C apps/desktop storybook:build`
  - `pnpm desktop:test:e2e`
- Exit code: `0`
- Key output:
  - `lint` 通过（3 warnings，0 errors）
  - `typecheck` 通过
  - `test:unit` 通过
  - `apps/desktop test:run` 通过（`86 files`, `1242 tests`）
  - `test:integration` 通过
  - `test:ipc:acceptance` 通过
  - `contract:check` 通过
  - `storybook:build` 通过
  - `desktop:test:e2e` 通过（`50 passed`, `2 skipped`）

### 2026-02-09 04:02 跨模块契约核对（Red 差异证据）

- Command:
  - `rg -n '"skill:execute"|"skill:stream:chunk"|"skill:stream:done"|"skill:cancel"|"ai:chat:send"' apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `rg -n "ai:skill:run|ai:skill:stream|ai:skill:cancel" apps/desktop/main/src/ipc/contract/ipc-contract.ts packages/shared/types/ai.ts`
  - `rg -n "knowledge:query:byIds|knowledge:query:byids" openspec/specs/cross-module-integration-spec.md apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `rg -n "success: true|ok: true" openspec/specs/cross-module-integration-spec.md packages/shared/types/ipc-generated.ts`
  - `rg -n "PROJECT_SWITCH_TIMEOUT|DOCUMENT_SAVE_CONFLICT|MEMORY_BACKPRESSURE|SKILL_TIMEOUT|AI_PROVIDER_UNAVAILABLE|VERSION_MERGE_TIMEOUT|SEARCH_TIMEOUT|CONTEXT_SCOPE_VIOLATION" apps/desktop/main/src/ipc/contract/ipc-contract.ts packages/shared/types/ipc-generated.ts`
  - `rg -n "export:project|export:document" apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- Exit code: `1`（包含预期未命中）
- Key output:
  - 未发现 `skill:*` 与 `ai:chat:send`，实现侧存在 `ai:skill:*`
  - 规范 `knowledge:query:byIds` 与实现 `knowledge:query:byids` 不一致
  - 规范使用 `success`，实现使用 `ok`
  - 示例错误码若干在当前错误字典中未命中
  - 导出通道仅发现 `export:document:*`
- Conclusion:
  - 形成 4 个 `Partial` + 2 个 `Missing` 差异项，并进入 delta report。

### 2026-02-09 04:17 任务与文档落盘

- Command:
  - `rulebook task create issue-326-layer2-layer3-integration-gate`
  - `rulebook task --help`
  - `sed -n '1,320p' openspec/specs/cross-module-integration-spec.md`
  - `rg -n "...contract diff patterns..." apps/desktop/main/src/ipc/contract/ipc-contract.ts packages/shared/types/ipc-generated.ts`
  - `edit openspec/changes/issue-326-layer2-layer3-integration-gate/*`
  - `edit openspec/_ops/task_runs/ISSUE-326.md`
  - `edit rulebook/tasks/issue-326-layer2-layer3-integration-gate/*`
  - `edit openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - Rulebook task 创建成功
  - OpenSpec change 三件套 + delta report + RUN_LOG 已补齐
  - `EXECUTION_ORDER.md` 已同步为单活跃 change 状态

### 2026-02-09 04:20 本地校验与依赖修复

- Command:
  - `rulebook task validate issue-326-layer2-layer3-integration-gate`
  - `pnpm contract:check`
  - `pnpm install --frozen-lockfile`
  - `rulebook task validate issue-326-layer2-layer3-integration-gate`
  - `pnpm contract:check`
- Exit code: `0`（最终）
- Key output:
  - 首次 `contract:check` 因 worktree 未安装依赖失败：`tsx: not found`
  - 安装依赖后 `contract:check` 通过
  - Rulebook validate 最终通过（无 warning）

### 2026-02-09 04:24 全量门禁复核（当前 worktree）

- Command:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test:unit`
- Exit code: `1`（首次）
- Key output:
  - `lint` 通过（3 warnings，0 errors）
  - `typecheck` 通过
  - `test:unit` 失败：`better-sqlite3` ABI 不匹配（`NODE_MODULE_VERSION 143` vs `115`）

### 2026-02-09 04:26 原生依赖修复（systematic debugging）

- Root cause:
  - worktree 中 `better-sqlite3` 二进制与当前 Node ABI 不一致。
- Command:
  - `node -v && node -p 'process.versions.modules'`
  - `pnpm -C apps/desktop rebuild better-sqlite3`
  - `pnpm exec tsx apps/desktop/tests/unit/projectService.projectActions.test.ts`
  - `pnpm test:unit`
- Exit code: `0`
- Key output:
  - `rebuild better-sqlite3` 成功执行 install/build
  - 失败用例 `projectService.projectActions.test.ts` 转绿
  - `test:unit` 全量通过

### 2026-02-09 04:28-04:31 全量门禁收口

- Command:
  - `pnpm -C apps/desktop test:run`
  - `pnpm test:integration`
  - `pnpm test:ipc:acceptance`
  - `pnpm -C apps/desktop storybook:build`
  - `pnpm desktop:test:e2e`
  - `pnpm contract:check`
- Exit code: `0`
- Key output:
  - `apps/desktop test:run` 通过：`86 files`, `1242 tests`
  - `test:integration` 通过
  - `test:ipc:acceptance` 通过（gate=PASS）
  - `storybook:build` 通过
  - `desktop:test:e2e` 通过：`50 passed`, `2 skipped`
  - `contract:check` 通过
