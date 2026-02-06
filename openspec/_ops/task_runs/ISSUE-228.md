# ISSUE-228

- Issue: #228
- Branch: `task/228-p0-001-dashboard-project-actions`
- PR: https://github.com/Leeky1017/CreoNow/pull/229

## Goal

- 完成 P0-001：Dashboard 项目操作闭环（rename/duplicate/archive/unarchive），含 DB 迁移、IPC 契约、renderer store/UI、unit+e2e 覆盖，并满足交付门禁。

## Status

- CURRENT: PR 已创建并开启合并流程，等待 checks 全绿并确认 mergedAt。

## Next Actions

- [x] 运行 `scripts/agent_pr_preflight.sh` 并记录输出。
- [x] 提交并推送（commit message 含 `(#228)`）。
- [x] 创建 PR（body 含 `Closes #228`）并开启 auto-merge。
- [ ] 监控 `ci`/`openspec-log-guard`/`merge-serial` 并确认 `mergedAt != null`。

## Decisions Made

- 2026-02-06: `project:list` 请求从 `includeDeleted` 切换为 `includeArchived`，并返回 `archivedAt?: number`（不返回 null）以适配当前 schema 能力。
- 2026-02-06: duplicate 的 MVP 范围固定为复制 documents + best-effort 复制 `.creonow` 元数据，不复制 document_versions。
- 2026-02-06: Dashboard 默认隐藏 archived，仅在可展开 Archived 分组中展示；archive/unarchive 均走统一确认对话框。

## Errors Encountered

- 2026-02-06: `pnpm typecheck` 初次失败（IPC generated 未刷新 + stories/tests mock 缺少新增 action）。处理：`pnpm contract:generate`，并补齐 `ProjectStore` 新 action 的 mock。
- 2026-02-06: `pnpm exec tsx apps/desktop/tests/unit/projectService.projectActions.test.ts` 失败（better-sqlite3 ABI 143/115 不匹配）。处理：在模块目录执行 `npm run build-release` 重新编译 native 模块后通过。
- 2026-02-06: `pnpm -C apps/desktop test:e2e -- ...` 失败（Electron 启动参数不兼容：`bad option: --remote-debugging-port=0`）。处理：用 `DEBUG=pw:browser*` 复现并确认是环境/工具链兼容问题，已记录为 blocker。
- 2026-02-06: 首次 `agent_pr_preflight` 因 Prettier 未格式化失败。处理：`pnpm exec prettier --write` 对 preflight 列表全量格式化。
- 2026-02-06: 运行 e2e 触发 `electron-rebuild` 后，`agent_pr_preflight` 再次在 `test:unit` 因 better-sqlite3 ABI 失配失败。处理：重新执行 `npm run build-release` 恢复 Node ABI，preflight 通过。

## Runs

### 2026-02-06 00:00 Baseline

- Command:
  - `pnpm install`
  - `pnpm typecheck`
- Key output:
  - 安装依赖完成。
  - 首轮 typecheck 暴露 contract 失配、store mock 缺失、新增测试 TS 细节问题。
- Evidence:
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`

### 2026-02-06 00:00 Contract + Type fixes

- Command:
  - 更新 `projectService/ipc/store` 的 `archivedAt` 语义
  - `pnpm contract:generate`
  - `pnpm typecheck`
- Key output:
  - 生成 `project:*` 新通道类型并切换 `project:list includeArchived`。
  - `pnpm typecheck` 通过。
- Evidence:
  - `apps/desktop/main/src/services/projects/projectService.ts`
  - `apps/desktop/main/src/ipc/project.ts`
  - `packages/shared/types/ipc-generated.ts`

### 2026-02-06 00:00 UI + tests closure

- Command:
  - 完成 Dashboard rename/archive UI 收口
  - 新增 `dashboard-project-actions` e2e 与 `projectService.projectActions` unit
  - `pnpm -C apps/desktop test:run`
- Key output:
  - Dashboard 新增测试通过（包含 rename 与 archived 分组行为）。
  - desktop vitest 全量通过（1216 passed）。
- Evidence:
  - `apps/desktop/renderer/src/features/dashboard/DashboardPage.tsx`
  - `apps/desktop/renderer/src/features/dashboard/RenameProjectDialog.tsx`
  - `apps/desktop/renderer/src/features/dashboard/DashboardPage.test.tsx`
  - `apps/desktop/tests/unit/projectService.projectActions.test.ts`
  - `apps/desktop/tests/e2e/dashboard-project-actions.spec.ts`

### 2026-02-06 00:00 Gate verification

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test:unit`
  - `pnpm test:integration`
  - `pnpm -C apps/desktop test:run`
  - `pnpm contract:check`
- Key output:
  - typecheck/lint/unit/integration/desktop vitest/contract:check 全通过。
  - lint 仅历史 warning（0 errors）。
- Evidence:
  - 命令输出（当前 run）

### 2026-02-06 00:00 E2E blocker diagnosis

- Command:
  - `pnpm -C apps/desktop test:e2e -- tests/e2e/dashboard-project-actions.spec.ts tests/e2e/version-history.spec.ts`
  - `DEBUG=pw:browser* pnpm exec playwright test -c tests/e2e/playwright.config.ts tests/e2e/dashboard-project-actions.spec.ts --workers=1 --reporter=line`
- Key output:
  - 多个用例在进程启动前失败：`Process failed to launch!`。
  - 诊断日志显示：Electron 报错 `bad option: --remote-debugging-port=0`。
- Evidence:
  - `apps/desktop/tests/e2e/playwright.config.ts`
  - Playwright debug log（当前 run）

### 2026-02-06 00:00 Preflight recovery and pass

- Command:
  - `scripts/agent_pr_preflight.sh`（failed: prettier）
  - `pnpm exec prettier --write ...`（preflight listed files）
  - `scripts/agent_pr_preflight.sh`（failed: better-sqlite3 ABI after e2e rebuild）
  - `cd node_modules/.pnpm/better-sqlite3@12.6.2/node_modules/better-sqlite3 && npm run build-release`
  - `scripts/agent_pr_preflight.sh`（pass）
- Key output:
  - 第一次 preflight 失败点：Prettier check。
  - 第二次 preflight 失败点：`projectService.projectActions.test.ts` 触发 better-sqlite3 ABI 143/115 mismatch。
  - 第三次 preflight 通过（typecheck/lint/contract:check/test:unit）。
- Evidence:
  - `scripts/agent_pr_preflight.sh` 输出（latest）

### 2026-02-06 00:00 Final preflight before commit

- Command:
  - `scripts/agent_pr_preflight.sh`
- Key output:
  - preflight 通过（含 typecheck/lint/contract:check/test:unit）。
  - lint 仅历史 warning（0 errors）。
- Evidence:
  - `scripts/agent_pr_preflight.sh` 输出（latest）

### 2026-02-06 00:00 Commit, push, PR

- Command:
  - `git commit -m "feat: close dashboard project actions loop (#228)"`
  - `git push -u origin HEAD`
  - `gh pr create --title "[MVP-REMED] P0-001: Dashboard project actions closure (#228)" --body-file /tmp/pr228_body.md`
- Key output:
  - 提交 `c8f4eeb` 已推送至远端分支。
  - PR `#229` 已创建，body 包含 `Closes #228`。
- Evidence:
  - `https://github.com/Leeky1017/CreoNow/pull/229`
