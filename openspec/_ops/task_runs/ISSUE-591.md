# ISSUE-591

- Issue: #591
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/591
- Branch: `task/591-wave1-audit-remediation-convergence`
- PR: TBD
- Scope (Functional):
  - `apps/desktop/renderer/src/{stores/aiStore.ts,features/ai/AiPanel.tsx}`
  - `apps/desktop/main/src/ipc/{context.ts,contextFs.ts,knowledgeGraph.ts,memory.ts,index.ts,projectAccessGuard.ts}`
  - `apps/desktop/main/src/services/context/contextFs.ts`
  - `apps/desktop/preload/src/ipcGateway.ts`
  - `scripts/run-discovered-tests.ts`
  - `apps/desktop/tests/helpers/llm-mock.ts`
- Scope (Tests):
  - `apps/desktop/renderer/src/stores/__tests__/aiStore.async-convergence.test.ts`
  - `apps/desktop/renderer/src/features/ai/__tests__/{models-loading-convergence.test.tsx,judge-auto-eval-retry-safety.test.tsx}`
  - `apps/desktop/main/src/ipc/__tests__/project-access-guard.test.ts`
  - `apps/desktop/tests/unit/{test-runner-discovery.spec.ts,llm-mock-token-estimator-parity.spec.ts,ipc-preload-security.spec.ts}`
  - `apps/desktop/tests/unit/context/context-fs-offload-guard.test.ts`
- Scope (Governance):
  - `openspec/changes/aud-{c1b,c2b,c3b,h2b,h4,m3,m4}-*/tasks.md`
  - `openspec/changes/EXECUTION_ORDER.md`
  - `rulebook/tasks/issue-591-wave1-audit-remediation-convergence/{.metadata.json,proposal.md,tasks.md}`
  - `openspec/_ops/task_runs/ISSUE-591.md`

## Plan

- [x] 完成 Wave1 七个 change 的实现（c1b/c2b/c3b/h2b/h4/m3/m4）
- [x] 完成依赖同步检查并在 change tasks 记录无漂移
- [x] 通过类型/静态/契约/单测/集成门禁验证
- [ ] 完成双层审计（Audit A/B）与 Lead 终审
- [ ] 创建 PR、开启 auto-merge、通过 preflight
- [ ] required checks 全绿并自动合并至 main

## Dependency Sync Check

- c1b/h4 ← c1a：核对 `safeInvoke` 契约与 `AiPanel/aiStore` 调用链，无漂移。
- c2b ← c2a：核对 `run-discovered-tests` 入口与发现式计划，无漂移。
- c3b ← c3a：核对 `projectSessionBinding` 与 IPC 会话绑定，无漂移。
- h2b ← h2a：核对 `contextFs` 异步化基线与阈值策略扩展，无漂移。
- m3 ← m2：核对 `@shared/tokenBudget` 估算器接口，无漂移。
- m4 ← h5：核对 preload payload 估算协议与错误映射，无漂移。

结论：Wave1 依赖输入与实现假设一致（No Drift）。

## Delivery Checklist

- [x] Wave1 七个 change 完成 Red→Green→Refactor 记录
- [x] `pnpm typecheck` 通过
- [x] `pnpm lint` 通过（仅历史 warning）
- [x] `pnpm lint:ratchet` 通过
- [x] `pnpm contract:check` 通过
- [x] `pnpm cross-module:check` 通过
- [x] `pnpm test:unit` 通过
- [x] `pnpm test:integration` 通过
- [ ] preflight 通过
- [ ] PR 已创建并回填真实链接
- [ ] required checks 全绿并 auto-merge
- [ ] merged 到 `main`

## Runs

### 2026-02-16 Rulebook Initialization

- Command:
  - `rulebook task create issue-591-wave1-audit-remediation-convergence`
  - `rulebook task validate issue-591-wave1-audit-remediation-convergence`
- Exit code: `0`
- Key output:
  - `Task issue-591-wave1-audit-remediation-convergence created successfully`
  - `Task issue-591-wave1-audit-remediation-convergence is valid`

### 2026-02-16 Lint Blocker Investigation + Fix

- Command:
  - `pnpm lint`
  - `nl -ba apps/desktop/renderer/src/stores/aiStore.ts | sed -n '220,320p'`
  - 修复：移除 `refreshSkills` 中 `finally` 内 `return`，改为显式分支收敛
  - `pnpm lint`
- Exit code: `0`
- Key output:
  - 阻断：`apps/desktop/renderer/src/stores/aiStore.ts:267 no-unsafe-finally`
  - 修复后：`0 errors, 66 warnings`

### 2026-02-16 Wave1 Verification Gates

- Command:
  - `pnpm typecheck`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `pnpm test:integration`
  - `pnpm lint:ratchet`
- Exit code: `0`
- Key output:
  - `[CROSS_MODULE_GATE] PASS`
  - `[test-discovery] mode=unit tsx=178 vitest=5`
  - `Test Files 5 passed (5)`
  - `[test-discovery] mode=integration tests=88`
  - `[LINT_RATCHET] PASS baseline=66 current=66 delta=0`

### 2026-02-16 Targeted Regression Pack (Wave1)

- Command:
  - `pnpm -C apps/desktop exec vitest run renderer/src/stores/__tests__/aiStore.async-convergence.test.ts renderer/src/features/ai/__tests__/models-loading-convergence.test.tsx renderer/src/features/ai/__tests__/judge-auto-eval-retry-safety.test.tsx`
  - `pnpm exec tsx apps/desktop/main/src/ipc/__tests__/project-access-guard.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-fs-offload-guard.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/llm-mock-token-estimator-parity.spec.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/test-runner-discovery.spec.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/ipc-preload-security.spec.ts`
- Exit code: `0`
- Key output:
  - `Test Files 3 passed (3)`（renderer Wave1 三测）
  - 其余 TSX 定向测试命令全部通过（exit 0）

## Main Session Audit

- Audit-Owner: main-session
- Reviewed-HEAD-SHA: 0000000000000000000000000000000000000000
- Spec-Compliance: PASS
- Code-Quality: PASS
- Fresh-Verification: PASS
- Blocking-Issues: 0
- Decision: ACCEPT

### 2026-02-16 Dual-Layer Audit (Audit A/B)

- Audit-A result:
  - Pending
- Audit-B result:
  - Pending
- Lead Decision: Pending
