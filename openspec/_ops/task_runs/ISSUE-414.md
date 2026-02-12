# ISSUE-414

- Issue: #414
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/414
- Branch: task/414-version-control-p3-branch-merge-conflict
- PR: https://github.com/Leeky1017/CreoNow/pull/418
- Scope: 完成交付 `openspec/changes/version-control-p3-branch-merge-conflict` 的全部规划任务（分支管理 + 三方合并 + 冲突解决）并按 OpenSpec/Rulebook/GitHub 门禁合并回控制面 `main`
- Out of Scope: 跨文档分支、分支权限/协作锁、自动冲突解决

## Goal

- 依据主 spec 与 change 规划，完成 P3 的后端、IPC、前端冲突解决链路，并拿到 required checks 全绿后合并到 `main`。

## Status

- CURRENT: P3 Green/Refactor 已完成，门禁验证已通过，正在执行 preflight + PR auto-merge + main 收口。

## Next Actions

- [x] 完成 Dependency Sync Check（p0/p2 + editor-p2）并落盘结论
- [x] 编写并运行 P3 Red 失败测试，记录失败证据
- [ ] 完成 preflight、PR auto-merge、控制面 main 收口与归档清理

## Decisions Made

- 2026-02-12 10:10 +0800 使用 `task/414-version-control-p3-branch-merge-conflict` 独立 worktree 执行，避免污染控制面 `main`。
- 2026-02-12 10:10 +0800 先补齐 Rulebook task + RUN_LOG，再进入 Red，保证流程证据完整。

## Errors Encountered

- 2026-02-12 09:58 +0800 `gh issue create` body 中反引号触发 shell substitution（`openspec/...: Is a directory`）→ 立即改用 `gh issue edit --body-file` 纠正 issue 正文。

## Plan

- [x] 准入：创建 OPEN issue + Rulebook task + task branch/worktree
- [x] 规格基线：完成 Dependency Sync Check 并确认 `NO_DRIFT`/`DRIFT`
- [x] Red：先写失败测试并记录失败证据
- [x] Green：最小实现通过 Scenario 映射
- [x] Refactor：整理实现并保持回归全绿
- [ ] preflight + PR auto-merge + main 收口 + cleanup

## Runs

### 2026-02-12 09:58 +0800 Issue 创建与修正

- Command:
  - `gh issue create --title "Deliver version-control-p3-branch-merge-conflict change and merge to main" --body "..."`
  - `gh issue edit 414 --body-file /tmp/issue-414-body.md`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/414`
  - 已修正 issue 正文中的 path 引用转义问题。

### 2026-02-12 10:01 +0800 Rulebook task 准入

- Command:
  - `rulebook task create issue-414-version-control-p3-branch-merge-conflict`
  - `rulebook task validate issue-414-version-control-p3-branch-merge-conflict`
- Exit code: `0`
- Key output:
  - task 创建成功并通过 validate。
  - warning: `No spec files found (specs/*/spec.md)`（非阻断）。

### 2026-02-12 10:04 +0800 Worktree 隔离

- Command:
  - `git fetch origin main`
  - `git worktree add .worktrees/issue-414-version-control-p3-branch-merge-conflict -b task/414-version-control-p3-branch-merge-conflict origin/main`
- Exit code: `0`
- Key output:
  - worktree 创建成功：`.worktrees/issue-414-version-control-p3-branch-merge-conflict`
  - 分支创建成功：`task/414-version-control-p3-branch-merge-conflict`

### 2026-02-12 10:10 +0800 Rulebook task 同步到当前 worktree

- Command:
  - `cp -R /home/leeky/work/CreoNow/rulebook/tasks/issue-414-version-control-p3-branch-merge-conflict /home/leeky/work/CreoNow/.worktrees/issue-414-version-control-p3-branch-merge-conflict/rulebook/tasks/`
- Exit code: `0`
- Key output:
  - 当前 task 分支已包含 `rulebook/tasks/issue-414-version-control-p3-branch-merge-conflict`。

### 2026-02-12 10:14 +0800 Dependency Sync Check（version-control-p0/p2 + editor-p2）

- Input:
  - `openspec/specs/version-control/spec.md`
  - `openspec/changes/version-control-p3-branch-merge-conflict/{proposal.md,tasks.md,specs/version-control-delta.md}`
  - `openspec/changes/archive/version-control-p0-snapshot-history/specs/version-control-delta.md`
  - `openspec/changes/archive/version-control-p2-diff-rollback/specs/version-control-delta.md`
  - `openspec/changes/archive/editor-p2-diff-ai-collaboration/specs/editor-delta.md`
  - `apps/desktop/main/src/services/documents/documentService.ts`
  - `apps/desktop/main/src/ipc/version.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/renderer/src/features/diff/{DiffViewPanel.tsx,MultiVersionCompare.tsx}`
- Checkpoints:
  - 数据结构：`document_versions` 与 `documents` 结构可承载分支 head/base 快照关系，需新增 branch 元数据表与冲突会话表，不与 p0/p2 字段冲突。
  - IPC 契约：当前主干缺少 `version:branch:create/list/switch/merge` 与 `version:conflict:resolve`，属于本 change 待实现项；现有 `version:snapshot:diff/rollback` 与 p2 一致。
  - 错误码：`VERSION_MERGE_TIMEOUT` 已在 IPC 错误码白名单中，可直接复用；`CONFLICT` 已存在。
  - 阈值：5s merge timeout 与主 spec 要求一致，不与现有超时策略冲突。
  - UI 组件 API：`DiffViewPanel` 已支持逐 hunk accept/reject，可复用于冲突块逐项解决；`MultiVersionCompare` 不需额外改动。
- Conclusion: `NO_DRIFT`

### 2026-02-12 10:16 +0800 Red 失败验证（首次，环境缺依赖）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/version-branch-merge-conflict.ipc.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/document-ipc-contract.test.ts`
  - `pnpm -C apps/desktop test:run renderer/src/stores/versionStore.test.ts`
- Exit code: `1` / `1` / `1`
- Key output:
  - `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL: Command "tsx" not found`
  - `vitest: not found`
- Resolution:
  - 执行 `pnpm install --frozen-lockfile` 后重跑 Red。

### 2026-02-12 10:16 +0800 Red 前环境准备（worktree 依赖）

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `Lockfile is up to date`
  - `Packages: +981`
  - `tsx` / `vitest` 工具链就绪。

### 2026-02-12 10:17 +0800 Red 失败验证（有效行为失败）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/version-branch-merge-conflict.ipc.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/document-ipc-contract.test.ts`
  - `pnpm -C apps/desktop test:run renderer/src/stores/versionStore.test.ts`
- Exit code: `1` / `1` / `1`
- Key output:
  - `version-branch-merge-conflict.ipc.test.ts`：`version:branch:create handler should be registered`
  - `document-ipc-contract.test.ts`：`missing required channel: version:branch:create`
  - `versionStore.test.ts`：`mergeBranch is not a function`（2 个失败用例）
- Conclusion:
  - Red 成功触发，失败覆盖 IPC handler 缺失、IPC contract 缺失、renderer 分支冲突流程缺失。

### 2026-02-12 10:34 +0800 Red 失败验证（冲突解决 UI）

- Command:
  - `pnpm -C apps/desktop test:run renderer/src/features/version-history/VersionHistoryContainer.test.tsx`
- Exit code: `1`
- Key output:
  - 新增用例失败：`shows conflict panel when branch merge returns CONFLICT`
  - 新增用例失败：`submits manual conflict resolution via version:conflict:resolve`
  - 失败根因：缺少 `branch-merge-source-input` / `branch-merge-target-input` 与冲突提交 UI。

### 2026-02-12 10:35 +0800 Green：补齐冲突解决 UI 并转绿

- Command:
  - `pnpm -C apps/desktop test:run renderer/src/features/version-history/VersionHistoryContainer.test.tsx`
- Exit code: `0`
- Key output:
  - `VersionHistoryContainer.test.tsx (5 tests) PASS`
  - 冲突流程链路已打通：Merge 触发冲突 -> ours/theirs/manual 选择 -> `version:conflict:resolve` 提交。

### 2026-02-12 10:36 +0800 门禁回归（typecheck / lint / cross-module）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm cross-module:check`
- Exit code: `1` / `0` / `0`
- Key output:
  - `typecheck` 失败：`VersionHistoryContainer.tsx(658,23)` 分支状态收窄后仍比较 `"loading"`（`TS2367`）。
  - 修复：移除冲突面板内不可能分支判断后复跑 `pnpm typecheck` 通过。
  - `lint` 与 `cross-module:check` 通过（`[CROSS_MODULE_GATE] PASS`）。

### 2026-02-12 10:36 +0800 定向验证（contract + IPC + renderer）

- Command:
  - `pnpm contract:check`
  - `pnpm exec tsx apps/desktop/tests/unit/version-branch-merge-conflict.ipc.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/document-ipc-contract.test.ts`
  - `pnpm -C apps/desktop test:run renderer/src/stores/versionStore.test.ts`
  - `pnpm -C apps/desktop test:run renderer/src/features/version-history/VersionHistoryContainer.test.tsx`
- Exit code: `1` / `0` / `0` / `0` / `0`
- Key output:
  - `contract:check` 首次失败原因为：`packages/shared/types/ipc-generated.ts` 生成结果未入 index（`git diff --exit-code` 非零）。
  - IPC/renderer 定向测试全部通过。

### 2026-02-12 10:37 +0800 Contract gate 修复（本轮）

- Command:
  - `git add packages/shared/types/ipc-generated.ts`
  - `pnpm contract:check`
- Exit code: `0`
- Key output:
  - `contract:check` 复跑通过（`pnpm contract:generate` 后 `ipc-generated.ts` 无额外工作区差异）。

### 2026-02-12 10:37 +0800 全量回归（本轮）

- Command:
  - `pnpm test:unit`
  - `pnpm -C apps/desktop test:run`
- Exit code: `0` / `0`
- Key output:
  - `test:unit` 通过（包含 `version-branch-merge-conflict.ipc.test.ts` 与 `document-ipc-contract.test.ts`）。
  - `apps/desktop` 全量 vitest 通过：`Test Files 106 passed`, `Tests 1284 passed`。
  - 运行期存在既有 warning（Dialog aria 描述、act 包裹提示）但不阻断门禁，未新增 fail。

### 2026-02-12 10:43 +0800 Rulebook 校验（收口前）

- Command:
  - `rulebook task validate issue-414-version-control-p3-branch-merge-conflict`
- Exit code: `0`
- Key output:
  - `Task issue-414-version-control-p3-branch-merge-conflict is valid`
  - warning: `No spec files found (specs/*/spec.md)`（非阻断，历史基线一致）。

### 2026-02-12 10:45 +0800 Change/Rulebook 归档（本轮）

- Command:
  - `mv openspec/changes/version-control-p3-branch-merge-conflict openspec/changes/archive/`
  - 更新 `openspec/changes/EXECUTION_ORDER.md`（active 数量/顺序/依赖/更新时间）
  - `rulebook task archive issue-414-version-control-p3-branch-merge-conflict`
- Exit code: `0`
- Key output:
  - change 已归档：`openspec/changes/archive/version-control-p3-branch-merge-conflict`
  - Rulebook task 已归档：`rulebook/tasks/archive/2026-02-12-issue-414-version-control-p3-branch-merge-conflict`
  - `EXECUTION_ORDER.md` 已同步至归档后拓扑（active=5）。

### 2026-02-12 10:41 +0800 PR 自动流程首次执行（创建 PR + 回填 RUN_LOG）

- Command:
  - `scripts/agent_pr_automerge_and_sync.sh --merge-timeout 3600`
- Exit code: `1`（首次 preflight 阻断后进入等待）
- Key output:
  - 首次 preflight 阻断：`RUN_LOG PR field must be a real URL ... PENDING`
  - 脚本自动创建 PR：`https://github.com/Leeky1017/CreoNow/pull/418`（draft）
  - 自动提交并推送：`docs: backfill run log PR link (#414)`（PR 字段回填完成）
  - 二次 preflight 阻断：`pnpm exec prettier --check ...` 报 9 个文件格式不符合。

### 2026-02-12 10:44 +0800 Prettier 修复（preflight 阻断修复）

- Command:
  - `pnpm exec prettier --write apps/desktop/main/src/ipc/version.ts apps/desktop/main/src/services/documents/documentService.ts apps/desktop/main/src/services/documents/threeWayMerge.ts apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.test.tsx apps/desktop/renderer/src/stores/versionStore.tsx apps/desktop/tests/unit/version-branch-merge-conflict.ipc.test.ts rulebook/tasks/archive/2026-02-12-issue-414-version-control-p3-branch-merge-conflict/.metadata.json rulebook/tasks/archive/2026-02-12-issue-414-version-control-p3-branch-merge-conflict/proposal.md rulebook/tasks/archive/2026-02-12-issue-414-version-control-p3-branch-merge-conflict/tasks.md`
- Exit code: `0`
- Key output:
  - 9 个文件格式化完成，消除 preflight 的 Prettier 阻断项。

### 2026-02-12 10:45 +0800 Fresh 门禁复跑（格式修复后）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `pnpm -C apps/desktop test:run`
- Exit code: `0` / `0` / `0` / `0` / `0` / `0`
- Key output:
  - typecheck/lint/contract/cross-module 全绿。
  - `test:unit` 通过（含 `version-branch-merge-conflict.ipc.test.ts`）。
  - `apps/desktop` 全量 vitest 通过：`Test Files 106 passed`, `Tests 1284 passed`。

### 2026-02-12 10:46 +0800 Preflight 复跑（本轮）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `0`
- Key output:
  - Prettier 检查通过（`All matched files use Prettier code style!`）。
  - `typecheck` / `lint` / `contract:check` / `cross-module:check` / `test:unit` 全部通过。
