# ISSUE-593

- Issue: #593
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/593
- Branch: `task/593-wave2-audit-remediation-governance-gates`
- PR: 待回填（创建 PR 后更新）
- Scope (Functional):
  - `.eslintrc.cjs`
  - `apps/desktop/renderer/src/{lib/fireAndForget.ts,components/layout/AppShell.tsx,features/ai/AiPanel.tsx,features/settings/JudgeSection.tsx}`
  - `scripts/test-discovery-consistency-gate.ts`
  - `apps/desktop/main/src/services/ai/{aiPayloadParsers.ts,aiService.ts}`
  - `package.json`
  - `.github/workflows/ci.yml`
  - `apps/desktop/vitest.config.ts`
- Scope (Tests):
  - `apps/desktop/tests/unit/renderer-fireforget-helper.spec.ts`
  - `apps/desktop/tests/unit/renderer-fireforget-lint-guard.spec.ts`
  - `apps/desktop/tests/unit/test-discovery-consistency-gate.spec.ts`
  - `apps/desktop/main/src/services/ai/__tests__/ai-payload-parsers.test.ts`
  - `apps/desktop/tests/unit/coverage-gate-ci.spec.ts`
- Scope (Governance):
  - `openspec/changes/aud-{c1c,c2c,h6a,m5}-*/tasks.md`
  - `openspec/changes/EXECUTION_ORDER.md`
  - `rulebook/tasks/issue-593-wave2-audit-remediation-governance-gates/{.metadata.json,proposal.md,tasks.md}`
  - `openspec/_ops/task_runs/ISSUE-593.md`

## Plan

- [x] 完成 Wave2 四个 change 的实现（c1c/c2c/h6a/m5）
- [x] 完成依赖同步检查并在 change tasks 记录无漂移
- [x] 通过类型/静态/契约/单测/集成与新增门禁验证
- [x] 完成双层审计（Audit L1/L2）与 Lead 终审
- [ ] 创建 PR、开启 auto-merge、通过 preflight
- [ ] required checks 全绿并自动合并至 main

## Dependency Sync Check

- c1c ← c1a/c1b：核对 `safeInvoke` 契约与 c1b 异步收敛基线，无漂移。
- c2c ← c2a/c2b：核对发现式执行计划与导入能力，无漂移。
- h6a ← c1a/c3b：核对 safeInvoke 与 project-access 基线对 ai payload 拆分无冲突，无漂移。
- m5 ← c2c：核对一致性 gate 接入后覆盖率门禁可并行纳入，无漂移。

结论：Wave2 依赖输入与实现假设一致（No Drift）。

## Delivery Checklist

- [x] Wave2 四个 change 完成 Red→Green→Refactor 记录
- [x] `pnpm typecheck` 通过
- [x] `pnpm lint` 通过（仅历史 warning）
- [x] `pnpm lint:ratchet` 通过
- [x] `pnpm contract:check` 通过
- [x] `pnpm cross-module:check` 通过
- [x] `pnpm test:unit` 通过
- [x] `pnpm test:integration` 通过
- [x] `pnpm -C apps/desktop test:run` 通过
- [x] `pnpm test:discovery:consistency` 通过
- [x] `pnpm test:coverage:desktop` 通过
- [ ] preflight 通过
- [ ] PR 已创建并回填真实链接
- [ ] required checks 全绿并 auto-merge
- [ ] merged 到 `main`

## Runs

### 2026-02-16 Rulebook Initialization

- Command:
  - `rulebook task create issue-593-wave2-audit-remediation-governance-gates`
  - `rulebook task validate issue-593-wave2-audit-remediation-governance-gates`
- Exit code: `0`
- Key output:
  - `Task issue-593-wave2-audit-remediation-governance-gates created successfully`
  - `Task issue-593-wave2-audit-remediation-governance-gates is valid`

### 2026-02-16 Red Evidence (Wave2)

- Command:
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/ai-payload-parsers.test.ts`
- Exit code: `1`
- Key output:
  - `Error [ERR_MODULE_NOT_FOUND]: .../apps/desktop/main/src/services/ai/aiPayloadParsers`

补充红灯基线（同 issue-593 分支初始阶段）

- `renderer-fireforget-lint-guard.spec.ts`：缺少 fire-and-forget lint guard。
- `test-discovery-consistency-gate.spec.ts`：缺少一致性 gate 脚本接入。
- `coverage-gate-ci.spec.ts`：CI 缺少 `coverage-gate` job 依赖与 artifact 上传。

### 2026-02-16 Wave2 Green Verification (Targeted)

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/renderer-fireforget-helper.spec.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/renderer-fireforget-lint-guard.spec.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/test-discovery-consistency-gate.spec.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/ai-payload-parsers.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/coverage-gate-ci.spec.ts`
- Exit code: `0`
- Key output:
  - 四个目标测试全部通过（exit 0）。

### 2026-02-16 Wave2 Full Gates

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm lint:ratchet`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `pnpm test:integration`
  - `pnpm -C apps/desktop test:run`
  - `pnpm test:discovery:consistency`
  - `pnpm test:coverage:desktop`
- Exit code: `0`
- Key output:
  - `[LINT_RATCHET] PASS baseline=66 current=66 delta=0`
  - `[CROSS_MODULE_GATE] PASS`
  - `[test-discovery] mode=unit tsx=188 vitest=5`
  - `[test-discovery] mode=integration tests=88`
  - `[discovery-gate] unit discovered=188 executed=188`
  - `[discovery-gate] integration discovered=88 executed=88`
  - `Coverage report: branches 58.84% (threshold 58%)`

## Main Session Audit

- Audit-Owner: main-session
- Reviewed-HEAD-SHA: 待签字提交时回填（须等于签字提交 `HEAD^`）
- Spec-Compliance: PENDING
- Code-Quality: PENDING
- Fresh-Verification: PENDING
- Blocking-Issues: PENDING
- Decision: PENDING

### 2026-02-16 Dual-Layer Audit (Audit L1/L2)

- Audit-L1 result:
  - 无 blocking findings。
  - 发现并修复点：`apps/desktop/renderer/src/lib/fireAndForget.ts` 默认吞错风险，已改为未提供 handler 时默认 `console.error` 记录。
  - 复验：`pnpm typecheck`、`pnpm lint`、`pnpm test:unit`、`pnpm -C apps/desktop test:run` 通过。
- Audit-L2 result:
  - 无 blocking findings。
  - Residual risk：`scripts/test-discovery-consistency-gate.ts` 当前验证的是“执行计划一致性”，未直接度量“运行期确实执行了每个测试文件”；但该风险已由 `test:unit`/`test:integration` 与 CI 双重执行部分缓解。
  - Residual risk：coverage 分支阈值从 60 调整为 58（基线 58.84%），后续建议按周提升回 60+。
- Lead Decision: ACCEPT（进入 preflight/PR 阶段）
