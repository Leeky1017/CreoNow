# ISSUE-425

- Issue: #425
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/425
- Branch: task/425-version-control-p4-hardening-boundary
- PR: https://github.com/Leeky1017/CreoNow/pull/428
- Scope: 依据 `openspec/changes/version-control-p4-hardening-boundary` 完成交付（Red→Green→Refactor→门禁）并最终合并回控制面 `main`
- Out of Scope: 新增版本功能特性、跨项目协作权限模型改造

## Goal

- 补齐 Version Control p4 硬化边界：并发锁、回滚冲突、容量压缩、超大 Diff 保护、IO 重试与契约错误码统一。

## Status

- CURRENT: Green + 回归验证已完成；待 preflight、PR auto-merge、main 收口与归档。

## Next Actions

- [x] 完成 Dependency Sync Check 并落盘（结论 `NO_DRIFT`）
- [x] 记录 Red 失败证据（4 个场景）
- [x] 完成实现并验证 `typecheck/lint/contract/cross-module/test`
- [ ] 执行 preflight + PR auto-merge + 控制面 main 收口 + change/rulebook 归档

## Decisions Made

- 2026-02-12 12:06 +0800 使用 `task/425-version-control-p4-hardening-boundary` 独立 worktree 交付，避免污染控制面 `main`。
- 2026-02-12 12:13 +0800 为满足 p4 约束，在 IPC 层新增 document 级操作协调器（串行锁 + 并发槽 + 回滚冲突），并在 service 层落地容量/Diff 边界。
- 2026-02-12 12:22 +0800 复用现有 `ipc-contract` + runtime validation 体系表达 `version:*` schema（不额外引入新校验库），并同步更新错误码枚举。

## Errors Encountered

- 2026-02-12 12:06 +0800 `scripts/agent_worktree_setup.sh` 因控制面存在未跟踪目录（`issue-423/424/425`）阻断；改为手动执行 `fetch/pull/worktree add` 同等流程。
- 2026-02-12 12:24 +0800 临时性能基准脚本两次语法错误（`await` 作用域 / 顶层 await CJS 限制）；修正后成功输出 p95。

## Plan

- [x] 准入：新建 OPEN issue + Rulebook task + worktree
- [x] 规格：完成 Dependency Sync Check
- [x] Red：先写失败测试并记录失败输出
- [x] Green：最小实现使新增场景转绿
- [x] Refactor：保持全量门禁绿灯
- [ ] preflight + PR auto-merge + main 收口 + cleanup

## Runs

### 2026-02-12 12:05 +0800 Issue 与 Rulebook task 准入

- Command:
  - `gh issue create --title "Deliver version-control-p4-hardening-boundary change and merge to main" --body-file /tmp/issue-version-control-p4.md`
  - `rulebook task create issue-425-version-control-p4-hardening-boundary`
  - `rulebook task validate issue-425-version-control-p4-hardening-boundary`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/425`
  - Rulebook task 创建并通过 validate（warning: 缺少 specs/\*/spec.md，非阻断）。

### 2026-02-12 12:06 +0800 Worktree 环境隔离

- Command:
  - `scripts/agent_worktree_setup.sh 425 version-control-p4-hardening-boundary`
  - `git fetch origin main && git checkout main && git pull --ff-only origin main`
  - `git worktree add -b task/425-version-control-p4-hardening-boundary .worktrees/issue-425-version-control-p4-hardening-boundary origin/main`
  - `cp -R rulebook/tasks/issue-425-version-control-p4-hardening-boundary .worktrees/issue-425-version-control-p4-hardening-boundary/rulebook/tasks/`
- Exit code: `1`（首条）后 `0`
- Key output:
  - 脚本被控制面未跟踪目录阻断；手动流程创建成功：`.worktrees/issue-425-version-control-p4-hardening-boundary`。

### 2026-02-12 12:08 +0800 Dependency Sync Check（p0~p3）

- Input:
  - `openspec/specs/version-control/spec.md`
  - `openspec/changes/version-control-p4-hardening-boundary/{proposal.md,tasks.md,specs/version-control-delta.md}`
  - `openspec/changes/archive/version-control-p0-snapshot-history/**`
  - `openspec/changes/archive/version-control-p1-ai-mark-preview/**`
  - `openspec/changes/archive/version-control-p2-diff-rollback/**`
  - `openspec/changes/archive/version-control-p3-branch-merge-conflict/**`
  - 当前实现：`apps/desktop/main/src/{ipc/version.ts,ipc/contract/ipc-contract.ts,services/documents/documentService.ts}`
- Checkpoints:
  - 数据结构：沿用 `document_versions` / `document_branches` / `merge_sessions`，p4 仅新增边界控制，无 schema 漂移。
  - IPC 契约：`version:snapshot:*`、`version:branch:*`、`version:conflict:*` 通道均在 contract 中声明；补充 p4 错误码与 `snapshot:create` compaction 响应。
  - 错误码：与主 spec 对齐新增 `VERSION_SNAPSHOT_COMPACTED`、`VERSION_DIFF_PAYLOAD_TOO_LARGE`、`VERSION_ROLLBACK_CONFLICT`。
  - 阈值：`merge timeout=5s`（沿用 p3），`diff payload=2MB`，`snapshot capacity=50,000`。
- Conclusion: `NO_DRIFT`

### 2026-02-12 12:09 +0800 Red 失败验证

- Command:
  - `pnpm install --frozen-lockfile`
  - `pnpm exec tsx apps/desktop/tests/unit/version-hardening-boundary.ipc.test.ts`
- Exit code: `0`（install），`1`（Red）
- Key output:
  - `[FAIL] large diff payload rejected`
  - `[FAIL] snapshot compaction at capacity boundary`
  - `[FAIL] concurrent rollback conflict`
  - `[FAIL] snapshot create io retry`
  - 失败集合：`version hardening boundary checks failed: ...`

### 2026-02-12 12:16 +0800 Green 定向验证

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/version-hardening-boundary.ipc.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/document-ipc-contract.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/version-diff-rollback.ipc.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/version-branch-merge-conflict.ipc.test.ts`
- Exit code: `0`
- Key output:
  - P4 场景全部 `PASS`
  - 既有 version contract / rollback / branch merge 单测全部通过。

### 2026-02-12 12:18 +0800 回归门禁验证

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `pnpm -C apps/desktop test:run`
- Exit code: `0`
- Key output:
  - 全部命令通过。
  - `cross-module:check`: `[CROSS_MODULE_GATE] PASS`
  - `test:unit`: 新增 `version-hardening-boundary.ipc.test.ts` 通过
  - `apps/desktop test:run`: `Test Files 106 passed`, `Tests 1286 passed`。

### 2026-02-12 12:26 +0800 性能基准（p95）

- Command:
  - `pnpm exec tsx /tmp/version-p4-bench.ts`
  - `pnpm exec tsx /tmp/version-merge-bench.ts`
- Exit code: `0`
- Key output:
  - `snapshot:create p95=0.43ms (n=100)`
  - `snapshot:list p95=0.26ms (n=100)`
  - `snapshot:diff p95=0.08ms (n=99)`
  - `branch:merge p95=0.47ms (n=100)`

### 2026-02-12 12:29 +0800 Change / Rulebook 归档

- Command:
  - `mv openspec/changes/version-control-p4-hardening-boundary openspec/changes/archive/`
  - `rulebook task archive issue-425-version-control-p4-hardening-boundary`
  - 更新 `openspec/changes/EXECUTION_ORDER.md`（active=2）
- Exit code: `0`
- Key output:
  - change 已归档：`openspec/changes/archive/version-control-p4-hardening-boundary`
  - Rulebook task 已归档：`rulebook/tasks/archive/2026-02-12-issue-425-version-control-p4-hardening-boundary`

### 2026-02-12 12:31 +0800 格式化与最终门禁复跑

- Command:
  - `pnpm exec prettier --write <changed-files>`
  - `pnpm typecheck && pnpm lint && pnpm contract:check && pnpm cross-module:check && pnpm test:unit`
- Exit code: `0`
- Key output:
  - 变更文件格式化完成（`version.ts`、`documentService.ts`、`version-hardening-boundary.ipc.test.ts`、RUN_LOG 等）。
  - 全部门禁命令通过：`typecheck` / `lint` / `contract:check` / `cross-module:check` / `test:unit`。
