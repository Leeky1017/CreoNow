# ISSUE-398

- Issue: #398
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/398
- Branch: task/398-windows-e2e-ai-output-regression
- PR: （待回填）
- Scope: 修复 PR #397 后 `windows-e2e` 中 `ai-output/ai-diff` 缺失回归，恢复 `ai-apply` / `knowledge-graph` / `search-rag` 稳定通过
- Out of Scope: 新功能开发；主规范新增（本次为实现回归修复，沿用现有 `ai-service` + `ipc` 主 spec）

## Plan

- [x] Issue / Rulebook / worktree 准入
- [x] 复现失败并完成根因定位
- [x] Red：先写失败测试（响应归一化函数）
- [x] Green：最小修复 `ai:skill:run` 响应边界
- [x] 目标 E2E 回归验证
- [x] typecheck/lint/contract/cross-module/unit/integration 门禁
- [ ] preflight + PR auto-merge + main 收口 + cleanup

## Runs

### 2026-02-10 18:12 +0800 准入延续（Issue / Rulebook / worktree）

- Command:
  - `gh issue create --title "Fix windows-e2e ai-output/diff missing failures after PR #397" ...`
  - `rulebook task create issue-398-windows-e2e-ai-output-regression`
  - `rulebook task validate issue-398-windows-e2e-ai-output-regression`
  - `scripts/agent_worktree_setup.sh 398 windows-e2e-ai-output-regression`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/398`
  - 分支：`task/398-windows-e2e-ai-output-regression`
  - worktree：`.worktrees/issue-398-windows-e2e-ai-output-regression`
  - Rulebook task validate 通过（warning: no spec files）

### 2026-02-10 18:20 +0800 失败复现（与 CI 同症状）

- Command:
  - `pnpm -C apps/desktop test:e2e -- tests/e2e/ai-apply.spec.ts`
  - `CI=1 pnpm -C apps/desktop test:e2e -- tests/e2e/ai-apply.spec.ts -g "success path"`
  - `pnpm -C apps/desktop test:e2e -- tests/e2e/knowledge-graph.spec.ts`
  - `pnpm -C apps/desktop test:e2e -- tests/e2e/search-rag.spec.ts`
- Exit code: `1`
- Key output:
  - `ai-apply` 中 `data-testid="ai-diff"` 未出现
  - `knowledge-graph/search-rag` 中 `data-testid="ai-output"` 未出现
  - 与 CI `windows-e2e` 失败簇一致

### 2026-02-10 18:23 +0800 根因定位（日志 + 代码链路）

- Command:
  - `rg -n "ipc_response_validation_failed|ai:skill:run" /tmp -S`
  - `sed -n '420,760p' apps/desktop/main/src/ipc/ai.ts`
  - `sed -n '260,620p' apps/desktop/main/src/ipc/runtime-validation.ts`
  - `git show f4416919 -- apps/desktop/main/src/services/skills/skillExecutor.ts`
- Exit code: `0`
- Key output:
  - 主进程日志稳定出现 `ipc_response_validation_failed`（channel=`ai:skill:run`，`issueCount=1`）
  - `SkillExecutor` 新增内部字段 `contextPrompt`
  - `ai:skill:run` 响应使用 `...res.data` 透传，触发 response schema “额外字段禁止”校验
  - 渲染进程拿不到有效 output envelope，导致 `ai-output/ai-diff` 缺失

### 2026-02-10 18:31 +0800 Rulebook 修订与 validate

- Command:
  - `apply_patch rulebook/tasks/issue-398-windows-e2e-ai-output-regression/proposal.md`
  - `apply_patch rulebook/tasks/issue-398-windows-e2e-ai-output-regression/tasks.md`
  - `rulebook task validate issue-398-windows-e2e-ai-output-regression`
- Exit code: `0`
- Key output:
  - Proposal/Tasks 改为可执行内容（含根因、修复范围、门禁计划）
  - validate 通过（warning: no spec files）

### 2026-02-10 18:36 +0800 Red（先测失败）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/ai-skill-prompt-ordering.test.ts`
- Exit code: `1`
- Key output:
  - `SyntaxError: ... does not provide an export named 'toSkillRunResponseData'`
- 结论:
  - 新增回归断言先失败，满足 Red 前置

### 2026-02-10 18:39 +0800 Green（最小实现）

- Command:
  - `apply_patch apps/desktop/main/src/ipc/ai.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/ai-skill-prompt-ordering.test.ts`
- Exit code: `0`
- Key output:
  - 新增 `toSkillRunResponseData`（仅输出 IPC 契约字段）
  - `ai:skill:run` 成功响应路径统一走归一化函数，剔除 `contextPrompt`
  - 新增回归断言转绿

### 2026-02-10 18:45 +0800 目标 E2E 回归验证

- Command:
  - `pnpm -C apps/desktop test:e2e -- tests/e2e/ai-apply.spec.ts tests/e2e/knowledge-graph.spec.ts tests/e2e/search-rag.spec.ts`
- Exit code:
  - 首次 `1`（`ai-apply` 断言仍检查旧语义 `ai-apply:*`）
  - 修复后 `0`
- Key output:
  - 新问题定位：当前实现/主规范使用 `reason="ai-accept"`，测试断言陈旧
  - 修复：`apps/desktop/tests/e2e/ai-apply.spec.ts` 断言对齐 `ai-accept`
  - 复跑结果：`6 passed`

### 2026-02-10 18:48 +0800 质量门禁（type/lint/contract/cross-module）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
- Exit code: `0 / 0 / 0 / 0`
- Key output:
  - `contract:generate` 无漂移
  - `cross-module-contract-gate` 输出 `[CROSS_MODULE_GATE] PASS`

### 2026-02-10 18:52 +0800 全量 unit/integration 与原生模块冲突处置

- Command:
  - `pnpm test:unit`
  - `pnpm test:integration`
- Exit code:
  - `test:unit` 首次 `1`（`better-sqlite3` ABI 143 vs Node ABI 115）
  - `npm_config_build_from_source=true pnpm --dir apps/desktop rebuild better-sqlite3` 后 `test:unit=0`
  - `test:integration=0`
- Key output:
  - 失败原因是 E2E 前置 `electron-rebuild` 产生的 ABI 切换，不是业务回归
  - 重编译后 unit/integration 全绿

### 2026-02-10 18:56 +0800 preflight 首次阻断（RUN_LOG PR 占位符）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `PRE-FLIGHT FAILED: [RUN_LOG] PR field still placeholder ... ISSUE-398.md: （待回填）`
- 结论:
  - 需先创建 PR 并回填真实链接，再复跑 preflight
