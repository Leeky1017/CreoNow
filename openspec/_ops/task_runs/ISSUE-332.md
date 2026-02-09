# ISSUE-332

- Issue: #332
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/332
- Branch: task/332-cross-module-drift-zero
- PR: https://github.com/Leeky1017/CreoNow/pull/333
- Scope: 清零 cross-module 已登记 16 项漂移，移除对应 baseline 例外并完成门禁收口
- Out of Scope: 新增 required checks、无关 IPC 重构、直接修改主 spec

## Plan

- [x] 任务准入（OPEN issue + task branch + worktree）
- [x] OpenSpec / Rulebook / Dependency Sync Check 落盘
- [x] TDD Red 失败证据
- [x] Green 实现与全量回归
- [ ] 提交 PR + auto-merge + main 收口

## Runs

### 2026-02-09 13:46 任务准入与仓库同步

- Command:
  - `gh auth status`
  - `git fetch origin main --prune`
  - `gh issue create --title "Resolve 16 cross-module drifts and remove baseline exceptions" --body-file /tmp/issue-cross-module-drift-zero.md`
- Exit code: `0`（首次 issue 创建命中 502，按规则重试后成功）
- Key output:
  - `https://github.com/Leeky1017/CreoNow/issues/332`
  - `main` 与 `origin/main` 同步到 `403d8c5a`

### 2026-02-09 13:48 环境隔离与依赖

- Command:
  - `git worktree add .worktrees/issue-332-cross-module-drift-zero -b task/332-cross-module-drift-zero origin/main`
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - worktree 创建成功：`.worktrees/issue-332-cross-module-drift-zero`
  - lockfile 无变更，依赖安装完成

### 2026-02-09 13:51 基线现状核对

- Command:
  - `pnpm contract:check && pnpm cross-module:check`
- Exit code: `0`
- Key output:
  - `cross-module:check` 输出 16 条 `DRIFT`（alias/missing/error/envelope）后 `PASS`
  - 确认当前为“登记放行”状态而非 drift-zero

### 2026-02-09 13:53-13:55 规格与 Rulebook 准入

- Command:
  - `rulebook task create issue-332-cross-module-drift-zero`
  - `edit openspec/changes/issue-332-cross-module-drift-zero/*`
  - `edit openspec/changes/EXECUTION_ORDER.md`
  - `edit rulebook/tasks/issue-332-cross-module-drift-zero/*`
  - `rulebook task validate issue-332-cross-module-drift-zero`
- Exit code: `0`
- Key output:
  - issue-332 change proposal/tasks/specs 落盘
  - `EXECUTION_ORDER.md` 更新为 4 个活跃 change
  - Rulebook validate 通过（warning：No spec files found）

### 2026-02-09 13:56 Red 失败证据

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/cross-module-drift-zero.spec.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/ipc-preload-security.spec.ts`
- Exit code: `1`（预期 Red）
- Key output:
  - `cross-module-drift-zero.spec.ts` 失败：缺失 `skill:stream:chunk` / `skill:stream:done` / `ai:chat:send` / `export:project:bundle` 与 8 个错误码
  - `ipc-preload-security.spec.ts` 失败：`packages/shared/types/ai` 尚未导出 `SKILL_STREAM_CHUNK_CHANNEL`

### 2026-02-09 13:57-14:03 Green 实现（最小对齐）

- Edited:
  - `packages/shared/types/ai.ts`
  - `apps/desktop/main/src/ipc/ai.ts`
  - `apps/desktop/preload/src/aiStreamBridge.ts`
  - `apps/desktop/preload/src/aiStreamSubscriptions.ts`
  - `apps/desktop/renderer/src/features/ai/useAiStream.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/main/src/ipc/export.ts`
  - `apps/desktop/main/src/services/export/exportService.ts`
  - `scripts/cross-module-contract-gate.ts`
  - `openspec/guards/cross-module-contract-baseline.json`
  - `packages/shared/types/ipc-generated.ts`
- Command:
  - `pnpm contract:generate`
  - `pnpm exec tsx apps/desktop/tests/unit/cross-module-drift-zero.spec.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/ipc-preload-security.spec.ts`
  - `pnpm cross-module:check`
  - `pnpm cross-module:autofix`
- Exit code: `0`
- Key output:
  - 新增通道：`ai:chat:send`、`export:project:bundle`
  - 流式通道改为 `skill:stream:chunk` / `skill:stream:done`
  - baseline 移除 `channelAliases` / `approvedMissingChannels` / `approvedMissingErrorCodes` / `approvedEnvelopeDrift`
  - `cross-module:check` 输出仅 `PASS`（无 `DRIFT`）
  - `cross-module:autofix` 输出 `PASS`

### 2026-02-09 14:04-14:07 全量回归（本地）

- Command:
  - `pnpm install --frozen-lockfile`
  - `pnpm contract:check`
  - `pnpm test:unit`
  - `pnpm test:integration`
  - `pnpm typecheck`
  - `pnpm lint`
  - `scripts/agent_pr_preflight.sh`
- Exit code:
  - `pnpm contract:check`：`1`（当前分支有未提交的 `ipc-generated.ts` 变更，diff 校验预期触发）
  - `scripts/agent_pr_preflight.sh`：`1`（`ISSUE-332.md` 的 PR 字段仍为 `TBD`）
  - 其余命令：`0`
- Key output:
  - `test:unit` 通过
  - `test:integration` 通过
  - `typecheck` 通过
  - `lint` 通过（0 error，既有 warning 3 条）
  - preflight 当前唯一阻断项为 RUN_LOG PR 占位符（待创建 PR 后回填）

### 2026-02-09 14:11 提交后复验

- Command:
  - `pnpm install --frozen-lockfile && pnpm contract:check && pnpm cross-module:check && pnpm cross-module:autofix`
  - `pnpm test:unit && pnpm test:integration && pnpm typecheck && pnpm lint`
- Exit code: `0`
- Key output:
  - `contract:check` 通过（`ipc-generated.ts` 与 SSOT 一致）
  - `cross-module:check` 仅输出 `[CROSS_MODULE_GATE] PASS`（无 DRIFT）
  - `cross-module:autofix` 输出 `PASS`（无待修复项）
  - `test:unit`、`test:integration`、`typecheck`、`lint` 全部通过（lint 仅既有 warning）

### 2026-02-09 14:12 推送与 PR 创建

- Command:
  - `git push -u origin task/332-cross-module-drift-zero`
  - `gh pr create --base main --head task/332-cross-module-drift-zero --title \"Resolve cross-module drift zero and remove baseline exceptions (#332)\" --body \"... Closes #332\"`
- Exit code: `0`
- Key output:
  - 分支推送成功
  - PR 创建成功：`https://github.com/Leeky1017/CreoNow/pull/333`
