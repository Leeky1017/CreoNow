# ISSUE-595

- Issue: #595
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/595
- Branch: `task/595-wave3-audit-remediation-architecture-decomposition`
- PR: https://github.com/Leeky1017/CreoNow/pull/596
- Scope (Functional):
  - `apps/desktop/main/src/services/memory/**`
  - `apps/desktop/main/src/services/documents/**`
  - `apps/desktop/renderer/src/components/layout/**`
  - `apps/desktop/renderer/src/features/ai/**`
- Scope (Tests):
  - `apps/desktop/tests/unit/memory/**`
  - `apps/desktop/main/src/services/documents/__tests__/**`
  - `apps/desktop/tests/unit/**renderer**`
- Scope (Governance):
  - `openspec/changes/aud-h6b-memory-document-decomposition/tasks.md`
  - `openspec/changes/aud-h6c-renderer-shell-decomposition/tasks.md`
  - `openspec/changes/EXECUTION_ORDER.md`
  - `rulebook/tasks/issue-595-wave3-audit-remediation-architecture-decomposition/{.metadata.json,proposal.md,tasks.md}`
  - `openspec/_ops/task_runs/ISSUE-595.md`

## Plan

- [x] 创建 Issue/worktree/Rulebook 基线
- [x] 完成依赖同步检查（h6b/h6c <- h6a）
- [x] 完成 h6b/h6c 的 Red → Green → Refactor
- [x] 完成双层审计与 Lead 终审
- [ ] 创建 PR，开启 auto-merge，required checks 全绿并自动合并

## Dependency Sync Check

- `aud-h6b-memory-document-decomposition` <- `aud-h6a-main-service-decomposition`：无漂移（No Drift）
- `aud-h6c-renderer-shell-decomposition` <- `aud-h6a-main-service-decomposition`：无漂移（No Drift）

## Delivery Checklist

- [x] `aud-h6b`、`aud-h6c` tasks.md 完成 TDD 勾选
- [x] Red 失败证据已落盘
- [x] Green 通过证据已落盘
- [x] `pnpm typecheck` / `pnpm lint` / `pnpm lint:ratchet` 通过
- [x] `pnpm contract:check` / `pnpm cross-module:check` 通过
- [x] `pnpm test:unit` / `pnpm test:integration` / `pnpm -C apps/desktop test:run` 通过
- [ ] preflight 通过
- [x] PR 已创建并回填真实链接
- [ ] required checks 全绿并 auto-merge
- [ ] merged 到 `main`

## Runs

### 2026-02-16 Wave3 Bootstrap

- Command:
  - `gh issue create --title "wave3: implement audit remediation architecture decomposition changes" --body-file /tmp/issue-wave3-595.md`
  - `git worktree add -b task/595-wave3-audit-remediation-architecture-decomposition .worktrees/issue-595-wave3-audit-remediation-architecture-decomposition origin/main`
  - `pnpm install --frozen-lockfile`
  - `rulebook task create issue-595-wave3-audit-remediation-architecture-decomposition`
  - `rulebook task validate issue-595-wave3-audit-remediation-architecture-decomposition`
- Exit code: `0`
- Key output:
  - Issue: `https://github.com/Leeky1017/CreoNow/issues/595`
  - Rulebook task 校验通过（仅 `No spec files found` 警告）。

### 2026-02-16 Dependency Sync Check (h6b/h6c <- h6a)

- Command:
  - `test -f apps/desktop/main/src/services/ai/aiPayloadParsers.ts && grep -n \"from \\\"./aiPayloadParsers\\\"\" apps/desktop/main/src/services/ai/aiService.ts && echo DEP_SYNC_H6A_OK`
- Exit code: `0`
- Key output:
  - `DEP_SYNC_H6A_OK`
  - `aiService.ts` 仍稳定依赖 `aiPayloadParsers.ts`，Wave2 上游拆分结果可复用，无依赖漂移。

### 2026-02-16 TDD Red (Wave3 初始失败证据)

- Command:
  - `pnpm exec tsx .../apps/desktop/tests/unit/memory/episodic-memory-helpers-extract.test.ts`
  - `pnpm exec tsx .../apps/desktop/main/src/services/documents/__tests__/document-diff-helpers.test.ts`
  - `pnpm exec tsx .../apps/desktop/tests/unit/renderer-app-shell-layout-helpers.test.ts`
  - `pnpm exec tsx .../apps/desktop/tests/unit/renderer-ai-panel-formatting.test.ts`
- Exit code: `1`（初始 Red 阶段）
- Key output:
  - 四个测试均出现 `ERR_MODULE_NOT_FOUND`（目标 helper 模块尚未提取），满足 Red 前置要求。

### 2026-02-16 TDD Green (Wave3 helper 提取 + 接线)

- Command:
  - `pnpm exec tsx /home/leeky/work/CreoNow/.worktrees/issue-595-wave3-audit-remediation-architecture-decomposition/apps/desktop/tests/unit/memory/episodic-memory-helpers-extract.test.ts`
  - `pnpm exec tsx /home/leeky/work/CreoNow/.worktrees/issue-595-wave3-audit-remediation-architecture-decomposition/apps/desktop/main/src/services/documents/__tests__/document-diff-helpers.test.ts`
  - `pnpm exec tsx /home/leeky/work/CreoNow/.worktrees/issue-595-wave3-audit-remediation-architecture-decomposition/apps/desktop/tests/unit/renderer-app-shell-layout-helpers.test.ts`
  - `pnpm exec tsx /home/leeky/work/CreoNow/.worktrees/issue-595-wave3-audit-remediation-architecture-decomposition/apps/desktop/tests/unit/renderer-ai-panel-formatting.test.ts`
- Exit code: `0`
- Key output:
  - 四个 Wave3 新增测试全部通过（无错误输出）。

### 2026-02-16 Static Gates

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm lint:ratchet`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
- Exit code: `0`
- Key output:
  - `tsc --noEmit` 通过。
  - `eslint` 维持历史基线告警（66 条，0 errors）。
  - `[LINT_RATCHET] PASS baseline=66 current=66 delta=0`
  - `[CROSS_MODULE_GATE] PASS`

### 2026-02-16 Test Gates + Blocker Remediation

- Command:
  - `pnpm test:unit`（首次失败）
  - `pnpm rebuild better-sqlite3`（无效）
  - `node -p "process.version + ' abi=' + process.versions.modules"`
  - `pnpm -C apps/desktop rebuild better-sqlite3`
  - `pnpm -C apps/desktop exec node -e "const Database=require('better-sqlite3'); ..."`
  - `pnpm test:unit`（二次失败，触发 A2-L-001 字符串守卫）
  - `pnpm exec tsx .../apps/desktop/tests/unit/sprint3/backlog-batch-recurrence-guards.test.ts`
  - `pnpm test:unit`
  - `pnpm test:integration`
  - `pnpm -C apps/desktop test:run`
- Exit code: `0`（最终）
- Key output:
  - 初次失败：`better_sqlite3.node ... NODE_MODULE_VERSION 143 ... requires 115`。
  - 根因：native 绑定 ABI 漂移（Electron 重建产物与 Node 测试进程不匹配）。
  - 修复验证：`BETTER_SQLITE3_NODE_OK`。
  - 二次失败：`A2-L-001: AppShell JSON parse failures must emit warning`。
  - 兼容修复：在 AppShell 保留 one-shot warning 门面，解析逻辑仍在 helper。
  - 最终门禁通过：
    - `test:unit` 全量通过（含 Storybook inventory guard）。
    - `test:integration` 通过。
    - `apps/desktop test:run` 通过（`153 passed` / `1459 passed`）。

### 2026-02-16 Final Re-Verification (post-fix)

- Command:
  - `pnpm typecheck`（首次失败，TS2554）
  - `pnpm lint`
  - `pnpm lint:ratchet`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - 修复 `appShellLayoutHelpers.ts` 函数签名后 `pnpm typecheck`
- Exit code: `0`（最终）
- Key output:
  - 失败点：`AppShell.tsx` 调用 `extractZenModeContent` 的第二参数与 helper 暴露签名不一致。
  - 修复后 `tsc --noEmit` 通过，`lint` / `lint:ratchet` 维持绿灯。
  - `contract:check` 通过；`[CROSS_MODULE_GATE] PASS`。

## Main Session Audit

- Audit-Owner: main-session
- Reviewed-HEAD-SHA: 8eaa8559217fb9d82dd9e88c03858240e1ba7a70
- Spec-Compliance: PASS
- Code-Quality: PASS
- Fresh-Verification: PASS
- Blocking-Issues: 0
- Decision: ACCEPT

### 2026-02-16 Dual Audit (L1/L2) + Lead Final Review

- L1 Spec/Contract Audit:
  - 覆盖面：`episodicMemoryService`/`documentCoreService`/`AppShell`/`AiPanel` 的 helper 抽取及对应新增测试。
  - 结论：Blocking-Issues=`0`；Scenario 映射、导出兼容、行为契约保持一致。
- L2 Regression/Quality Audit:
  - 覆盖面：回归风险、导出 API 兼容、守卫测试（A2-L-001）、native ABI 阻塞修复链路。
  - 结论：Blocking-Issues=`0`；仅剩仓库既有非阻断 warning/act 噪声，无新增门禁风险。
- Lead Final Review:
  - Decision=`ACCEPT_FOR_PR`
  - 说明：允许进入 preflight + PR + auto-merge 阶段。
