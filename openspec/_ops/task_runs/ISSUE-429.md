# ISSUE-429

- Issue: #429
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/429
- Branch: task/429-version-control-p4-save-contract-drift-fix
- PR: (待回填)
- Scope: 修复 `file:document:save` IPC 响应契约漂移并完成门禁合并回 `main`
- Out of Scope: 版本控制新功能开发、snapshot 业务策略调整

## Goal

- 消除 save 响应 schema 与实际返回值不一致导致的 runtime validation 失败。

## Status

- CURRENT: Red→Green→Refactor 已完成并归档 change/rulebook；待 PR auto-merge 与控制面 main 收口。

## Next Actions

- [x] 准入：创建 OPEN issue + Rulebook task + worktree
- [x] Spec：补充 delta 规格与依赖同步检查
- [x] Red：先写失败测试并记录失败证据
- [x] Green：最小实现让测试转绿
- [x] Refactor + 验证：执行本地门禁
- [ ] PR auto-merge + main 收口 + cleanup

## Decisions Made

- 2026-02-12 13:06 +0800 采用“最小契约修复”方案：只修正 `file:document:save` 响应 schema，不调整业务逻辑。

## Errors Encountered

- N/A

## Plan

- [x] 建立 issue/worktree/rulebook 准入
- [x] 建立 OpenSpec delta + RUN_LOG
- [x] Red 失败测试
- [x] Green 最小修复
- [x] Refactor 与门禁验证
- [ ] auto-merge + main 收口 + cleanup

## Runs

### 2026-02-12 13:05 +0800 准入与隔离环境

- Command:
  - `gh issue create --title "Fix file:document:save IPC contract drift after #425 merge" --body-file /tmp/issue-version-control-save-contract-drift.md`
  - `rulebook task create issue-429-version-control-p4-save-contract-drift-fix`
  - `rulebook task validate issue-429-version-control-p4-save-contract-drift-fix`
  - `git fetch origin main && git checkout main && git pull --ff-only origin main`
  - `git worktree add -b task/429-version-control-p4-save-contract-drift-fix .worktrees/issue-429-version-control-p4-save-contract-drift-fix origin/main`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/429`
  - Rulebook task validate 通过（warning: spec 文件未填充）
  - worktree 创建成功：`.worktrees/issue-429-version-control-p4-save-contract-drift-fix`

### 2026-02-12 13:07 +0800 Red（先测）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/document-ipc-contract.test.ts`
  - （依赖缺失后补充）`pnpm install --frozen-lockfile`
  - `pnpm exec tsx apps/desktop/tests/unit/document-ipc-contract.test.ts`
- Exit code: `1`（Red），`0`（install）
- Key output:
  - 首次执行报错：`Command "tsx" not found`
  - 安装依赖后，目标测试按预期失败：
    - `AssertionError: file:document:save response should include optional compaction event`
    - 失败定位：`apps/desktop/tests/unit/document-ipc-contract.test.ts:265`

### 2026-02-12 13:08 +0800 Green（最小实现）

- Command:
  - 修改 `apps/desktop/main/src/ipc/contract/ipc-contract.ts`：补齐 `file:document:save.response.compaction`
  - `pnpm contract:generate`
  - `pnpm exec tsx apps/desktop/tests/unit/document-ipc-contract.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/version-hardening-boundary.ipc.test.ts`
- Exit code: `0`
- Key output:
  - `document-ipc-contract.test.ts: all assertions passed`
  - `version-hardening-boundary.ipc.test.ts: all assertions passed`

### 2026-02-12 13:10 +0800 Refactor / 本地门禁验证

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
- Exit code: `0`（typecheck/lint/cross-module/test），`1`（contract:check，因 generated 文件有预期变更）
- Key output:
  - `typecheck` 通过
  - `lint` 通过
  - `contract:check` 显示 `packages/shared/types/ipc-generated.ts` 出现预期 diff（新增 `file:document:save.response.compaction`）
  - `[CROSS_MODULE_GATE] PASS`
  - `test:unit` 全通过

### 2026-02-12 13:12 +0800 Change / Rulebook 归档

- Command:
  - `mv openspec/changes/version-control-p4-save-contract-drift-fix openspec/changes/archive/`
  - `rulebook task archive issue-429-version-control-p4-save-contract-drift-fix`
  - 更新 `openspec/changes/EXECUTION_ORDER.md`（active=0）
- Exit code: `0`
- Key output:
  - change 已归档：`openspec/changes/archive/version-control-p4-save-contract-drift-fix`
  - Rulebook task 已归档：`rulebook/tasks/archive/2026-02-12-issue-429-version-control-p4-save-contract-drift-fix`
