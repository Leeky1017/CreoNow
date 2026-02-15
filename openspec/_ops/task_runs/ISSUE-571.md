# ISSUE-571

- Issue: #571
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/571
- Branch: task/571-s3-p3-backlog-batch
- PR: N/A（按任务约束：Do NOT create PR）
- Scope:
  - `openspec/changes/s3-p3-backlog-batch/**`
  - `apps/desktop/tests/integration/sprint3/backlog-batch-*.test.ts`
  - `apps/desktop/tests/unit/sprint3/backlog-batch-recurrence-guards.test.ts`
  - `apps/desktop/preload/src/aiStreamBridge.ts`
  - `apps/desktop/preload/src/index.ts`
  - `apps/desktop/renderer/src/components/layout/AppShell.tsx`
  - `apps/desktop/renderer/src/features/character/AddRelationshipPopover.tsx`
  - `apps/desktop/renderer/src/features/outline/OutlinePanel.tsx`
  - `apps/desktop/renderer/src/features/quality-gates/QualityGatesPanel.tsx`
  - `apps/desktop/renderer/src/features/settings-dialog/SettingsDialog.tsx`
  - `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx`
  - `apps/desktop/tests/e2e/command-palette.spec.ts`
  - `apps/desktop/tests/unit/kg/recognition-silent-degrade.test.ts`
  - `docs/references/tech-stack.md`
  - `rulebook/tasks/issue-571-s3-p3-backlog-batch/**`
- Out of Scope:
  - PR 创建 / auto-merge / main 同步
  - Sprint 3 其他 change（`s3-*`）功能实现

## Plan

- [x] 完成 AGENTS + OpenSpec + roadmap + change 三件套阅读
- [x] 完成 `pnpm install --frozen-lockfile`
- [x] 先做 Dependency Sync Check 并记录 `NO_DRIFT`
- [x] 按 `CMI-S3-BB-S1..S4` 先 Red 后 Green
- [x] 更新 Rulebook/Change/RUN_LOG 证据
- [x] commit + push（已执行，SHA=af778d8a207262b583f2b2654f4eef75cc4e405b）

## Runs

### 2026-02-15 环境与准入确认

- Command:
  - `pnpm install --frozen-lockfile`
  - `gh issue view 571 --json number,state,title,url`
- Exit code: `0`
- Key output:
  - `Lockfile is up to date`
  - `Done in 2s`
  - `{"number":571,"state":"OPEN","title":"Implement s3-p3-backlog-batch (Sprint3 W2)"...}`

### 2026-02-15 依赖同步检查（Dependency Sync Check）

- Inputs:
  - `docs/plans/unified-roadmap.md`（s3-p3-backlog-batch 14 项边界）
  - `openspec/specs/cross-module-integration-spec.md`
  - `openspec/changes/s3-p3-backlog-batch/specs/cross-module-integration-delta.md`
- Checkpoints:
  - 仅处理 14 个 Low 子项，不扩展 Medium/High
  - 修复不改变 IPC 通道、错误码和接口签名
  - 清理类改动需避免 ADDONLY/NOISE/DRIFT 回退
- Result: `NO_DRIFT`
- Follow-up:
  - 进入 Red，新增 S1..S4 focused tests 与审计映射证据。

### 2026-02-15 Red 失败证据（S1..S4）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/sprint3/backlog-batch-coverage.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/sprint3/backlog-batch-contract-stability.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/sprint3/backlog-batch-recurrence-guards.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/sprint3/backlog-batch-drift-guard.test.ts`
- Exit code: `1`
- Key output:
  - S1: `audit item map must exist: openspec/changes/s3-p3-backlog-batch/evidence/audit-item-map.json`
  - S2: `ENOENT ... audit-item-map.json`
  - S3: `A3-L-001: weak boolean-equality assertion must be removed`
  - S4: `A1-L-001: placeholder _onScrollSync parameter must be removed`

### 2026-02-15 Green 最小修复

- Changes:
  - 新增 `openspec/changes/s3-p3-backlog-batch/evidence/audit-item-map.json`（14 项映射）
  - 修复 `A1-L-001`：移除 `OutlinePanel.tsx` 的 `_onScrollSync` 占位参数
  - 修复 `A1-L-002`：`QualityGatesPanel.tsx` 下线 deprecated `panelStyles` 路径
  - 修复 `A2-L-001`：`AppShell.tsx` 对 JSON 解析失败增加一次性告警
  - 修复 `A3-L-001`：`recognition-silent-degrade.test.ts` 改为精确断言
  - 修复 `A4-L-002`：`tech-stack.md` 增补 `docx/pdfkit` 批准记录
  - 修复 `A6-L-001`：`aiStreamBridge.ts` 增加 `dispose()` 并移除 listener
  - 修复 `A6-L-002`：`AddRelationshipPopover.tsx` 引入 timer ref + `clearTimeout`
  - 修复 `A7-L-017~019`：TODO 注释统一关联 `#571`

### 2026-02-15 Focused verification（S1..S4）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/sprint3/backlog-batch-coverage.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/sprint3/backlog-batch-contract-stability.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/sprint3/backlog-batch-recurrence-guards.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/sprint3/backlog-batch-drift-guard.test.ts`
- Exit code: `0`
- Key output:
  - 四个测试命令均 exit `0`（S1/S2/S3/S4 全绿）。

### 2026-02-15 格式化 + 契约/治理复核（checkpoint 后）

- Command:
  - `pnpm exec prettier --check <changed-files>`
  - `pnpm exec prettier --write apps/desktop/renderer/src/features/character/AddRelationshipPopover.tsx apps/desktop/renderer/src/features/outline/OutlinePanel.tsx apps/desktop/renderer/src/features/quality-gates/QualityGatesPanel.tsx`
  - `pnpm exec prettier --check <changed-files>`
  - `pnpm exec tsx apps/desktop/tests/integration/sprint3/backlog-batch-coverage.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/sprint3/backlog-batch-contract-stability.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/sprint3/backlog-batch-recurrence-guards.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/sprint3/backlog-batch-drift-guard.test.ts`
  - `pnpm contract:check`
  - `rulebook task validate issue-571-s3-p3-backlog-batch`
- Exit code: `0`
- Key output:
  - Prettier: `All matched files use Prettier code style!`
  - `contract:check`：`pnpm contract:generate && git diff --exit-code packages/shared/types/ipc-generated.ts` 通过
  - Rulebook: `Task issue-571-s3-p3-backlog-batch is valid`

## Main Session Audit

- Audit-Owner: main-session
- Reviewed-HEAD-SHA: af778d8a207262b583f2b2654f4eef75cc4e405b
- Spec-Compliance: PASS
- Code-Quality: PASS
- Fresh-Verification: PASS
- Blocking-Issues: 0
- Decision: ACCEPT
