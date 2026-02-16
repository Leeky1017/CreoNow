# ISSUE-589

- Issue: #589
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/589
- Branch: `task/589-wave0-audit-remediation`
- PR: https://github.com/Leeky1017/CreoNow/pull/590
- Scope (Functional):
  - `apps/desktop/renderer/src/lib/ipcClient.ts`
  - `apps/desktop/preload/src/ipcGateway.ts`
  - `apps/desktop/main/src/ipc/{ai.ts,project.ts,contextFs.ts,projectSessionBinding.ts}`
  - `apps/desktop/main/src/services/{context/contextFs.ts,context/watchService.ts,export/exportService.ts,rag/ragService.ts}`
  - `packages/shared/{runtimeGovernance.ts,tokenBudget.ts}`
  - `scripts/run-discovered-tests.ts`
  - `package.json`（`test:unit` / `test:integration` 迁移为发现式执行）
- Scope (Tests):
  - `apps/desktop/renderer/src/lib/ipcClient.test.ts`
  - `apps/desktop/tests/unit/ipc-preload-security.spec.ts`
  - `apps/desktop/main/src/ipc/__tests__/{ai-chat-project-isolation.test.ts,projectSessionBinding.test.ts}`
  - `apps/desktop/main/src/services/context/__tests__/watchService.error-recovery.test.ts`
  - `apps/desktop/main/src/services/export/__tests__/export-project-bundle-streaming.guard.test.ts`
  - `apps/desktop/tests/unit/context/{context-fs-async-io.test.ts,context-fs-ipc-async-hotpath.guard.test.ts,token-budget-shared-helper.test.ts}`
  - `apps/desktop/tests/unit/{ai-runtime-governance-centralization.test.ts,test-runner-discovery.spec.ts,p4-integration-gate-coverage.spec.ts}`
  - `apps/desktop/tests/unit/main/vitest.node.config.ts`
- Scope (Governance):
  - `openspec/changes/aud-*/tasks.md`（Wave0 九项）
  - `openspec/_ops/task_runs/ISSUE-589.md`
  - `rulebook/tasks/issue-589-wave0-audit-remediation/{.metadata.json,proposal.md,tasks.md}`

## Plan

- [x] Wave0 9 个 change 的规格对齐与依赖同步检查
- [x] 完成 c1a/c2a/c3a/h1/h2a/h3/h5/m1/m2 实施改动
- [x] 完成关键回归测试与类型检查
- [ ] 完成双层审计（Audit A/B）与 Lead 终审
- [x] 创建 PR、开启 auto-merge、等待 required checks
- [ ] 合并回 `main` 并完成控制面收口

## Dependency Sync Check

- 检查输入：`openspec/changes/EXECUTION_ORDER.md` Wave0（`aud-c1a/c2a/c3a/h1/h2a/h3/h5/m1/m2`）
- 结论：无上游依赖阻塞（均为 Wave0 基础层）
- 结果：无漂移（No Drift）

## Delivery Checklist

- [x] Wave0 9 个 change 均有实现与测试映射
- [x] 发现式 test runner 已接管 `test:unit` / `test:integration`
- [x] `pnpm typecheck` 通过
- [x] `pnpm test:unit`（发现式）通过
- [x] `pnpm test:integration`（发现式）通过
- [ ] preflight 通过
- [x] PR 已创建且 RUN_LOG 回填真实 PR URL
- [ ] required checks 全绿并 auto-merge
- [ ] merged 到 `main`

## Runs

### 2026-02-16 Bootstrap (prior step)

- Command:
  - `gh issue create --title "wave0: implement audit remediation baseline changes" --body-file ...`
  - `git fetch origin main`
  - `git worktree add -b task/589-wave0-audit-remediation .worktrees/issue-589-wave0-audit-remediation origin/main`
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - Issue: `https://github.com/Leeky1017/CreoNow/issues/589`
  - Worktree: `.worktrees/issue-589-wave0-audit-remediation`

### 2026-02-16 Rulebook Initialization

- Command:
  - `rulebook task create issue-589-wave0-audit-remediation`
  - `rulebook task validate issue-589-wave0-audit-remediation`
  - `rulebook task update issue-589-wave0-audit-remediation --status in-progress`
- Exit code: `0`
- Key output:
  - `Task issue-589-wave0-audit-remediation created successfully`
  - `valid: true`

### 2026-02-16 Targeted Regression Pack

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/ipc-preload-security.spec.ts`
  - `pnpm exec tsx apps/desktop/main/src/ipc/__tests__/projectSessionBinding.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/ipc/__tests__/ai-chat-project-isolation.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/context/__tests__/watchService.error-recovery.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-fs-async-io.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-fs-ipc-async-hotpath.guard.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/export/__tests__/export-project-bundle-streaming.guard.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/config/__tests__/runtimeGovernance.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/token-budget-shared-helper.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/p4-integration-gate-coverage.spec.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/test-runner-discovery.spec.ts`
  - `pnpm -C apps/desktop exec vitest run renderer/src/lib/ipcClient.test.ts`
- Exit code: `0`
- Key output:
  - `renderer/src/lib/ipcClient.test.ts (7 tests) passed`

### 2026-02-16 Typecheck

- Command:
  - `pnpm typecheck`
- Exit code: `0`
- Key output:
  - `tsc --noEmit passed`

### 2026-02-16 Discovery Runner Verification

- Command:
  - `pnpm test:unit`
  - `pnpm test:integration`
- Exit code: `0`
- Key output:
  - `[test-discovery] mode=unit tsx=175 vitest=5`
  - `Test Files 5 passed (vitest bucket)`
  - `[test-discovery] mode=integration tests=88`

## Main Session Audit

- Audit-Owner: main-session
- Reviewed-HEAD-SHA: 9a5f4de41b00fff91aa4193eb04003efcebb60f1
- Spec-Compliance: PASS
- Code-Quality: PASS
- Fresh-Verification: PASS
- Blocking-Issues: 0
- Decision: ACCEPT

### 2026-02-16 Dual-Layer Audit (Audit A/B)

- Audit-A result:
  - Finding: `projectSessionBinding` stale entry risk (renderer destroyed后未清理)
- Audit-B result:
  - Finding: 同上（跨会话残留绑定风险）
  - Note: c3a 仅覆盖 chat，跨模块统一 `assertProjectAccess` 计划在 c3b 执行
- Lead Decision: `REJECT -> FIX -> ACCEPT`

### 2026-02-16 Audit Remediation

- Command:
  - 修复：`apps/desktop/main/src/index.ts` 增加 `web-contents-created` / `destroyed` 回收 `projectSessionBinding.clear`
  - 验证：
    - `pnpm typecheck`
    - `pnpm exec tsx apps/desktop/main/src/ipc/__tests__/projectSessionBinding.test.ts`
    - `pnpm exec tsx apps/desktop/main/src/ipc/__tests__/ai-chat-project-isolation.test.ts`
    - `pnpm -C apps/desktop exec vitest run renderer/src/lib/ipcClient.test.ts`
- Exit code: `0`
- Key output:
  - `tsc --noEmit passed`
  - 关键审计回归测试通过

### 2026-02-16 Lint Gates

- Command:
  - `pnpm lint`
  - `pnpm lint:ratchet`
- Exit code: `0`
- Key output:
  - `eslint completed (warnings only, no errors)`
  - `[LINT_RATCHET] PASS baseline=66 current=66 delta=0`

### 2026-02-16 PR Creation

- Command:
  - `gh pr create --base main --head task/589-wave0-audit-remediation --title "Implement wave0 audit remediation baseline (#589)" --body-file /tmp/pr589.md`
- Exit code: `0`
- Key output:
  - PR: `https://github.com/Leeky1017/CreoNow/pull/590`

### 2026-02-16 Preflight Blockers + Recovery

- Command:
  - `scripts/agent_pr_preflight.sh --issue 589 --slug wave0-audit-remediation --pr 590`（多轮）
  - `git add/commit/push openspec/_ops/task_runs/ISSUE-589.md`（主会话签字链修正）
  - `mkdir -p rulebook/tasks/issue-589-wave0-audit-remediation`
  - `cat > rulebook/tasks/issue-589-wave0-audit-remediation/{proposal.md,tasks.md,.metadata.json}`
  - `git add/commit/push rulebook/tasks/issue-589-wave0-audit-remediation/*`
- Exit code:
  - preflight：`1`（阶段失败，已定位修复）
  - git commit/push：`0`
- Key output:
  - `[MAIN_AUDIT] Reviewed-HEAD-SHA mismatch`
  - `[RULEBOOK] required task dir missing in both active and archive`
  - Rulebook active task 已补齐，进入下一轮 preflight 复验

### 2026-02-16 Execution Order Sync for Active Changes

- Command:
  - `scripts/agent_pr_preflight.sh --issue 589 --slug wave0-audit-remediation --pr 590`
  - `git add/commit/push openspec/changes/EXECUTION_ORDER.md`
- Exit code:
  - preflight：`1`（提示需同步 EXECUTION_ORDER）
  - git commit/push：`0`
- Key output:
  - `[OPENSPEC_CHANGE] active change content updated but openspec/changes/EXECUTION_ORDER.md not updated in this PR`
  - 已更新 `EXECUTION_ORDER.md` 的更新时间与 Wave0-3 波次进度快照
