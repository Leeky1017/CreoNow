# ISSUE-388

- Issue: #388
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/388
- Branch: task/388-ai-service-p5-failover-quota-hardening
- PR: https://github.com/Leeky1017/CreoNow/pull/389
- Scope: 交付 `openspec/changes/ai-service-p5-failover-quota-hardening` 全部任务（failover/half-open、预算与限流、全 provider 降级、trace 审计连续、并发与容量边界）并合并回控制面 `main`
- Out of Scope: UI 重设计、新增 provider 类型、放宽既有阈值（`maxTokens<=4096`、session `200000`、`60 req/min`）

## Plan

- [x] 准入：创建 OPEN issue + task branch/worktree + Rulebook task
- [x] Dependency Sync Check：核对 `ai-service-p0/p1/p3/p4` 并落盘 `NO_DRIFT`
- [x] Red：先补 6 个场景失败测试并记录失败证据
- [x] Green：最小实现通过 6 个场景映射
- [x] Refactor：收敛状态/配额逻辑并保持绿灯
- [ ] 门禁：typecheck/lint/contract/cross-module/unit/integration/preflight
- [ ] PR + auto-merge + main 收口 + Rulebook/Change 归档 + worktree 清理

## Runs

### 2026-02-10 14:01 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `gh issue create --title "ai-service-p5-failover-quota-hardening" --body "..."`
  - `scripts/agent_worktree_setup.sh 388 ai-service-p5-failover-quota-hardening`
  - `rulebook task create issue-388-ai-service-p5-failover-quota-hardening`
  - `rulebook task validate issue-388-ai-service-p5-failover-quota-hardening`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/388`
  - worktree 创建成功：`.worktrees/issue-388-ai-service-p5-failover-quota-hardening`
  - Rulebook task 校验通过：`issue-388-ai-service-p5-failover-quota-hardening`

### 2026-02-10 14:04 +0800 Dependency Sync Check（ai-service p0/p1/p3/p4）

- Input:
  - `openspec/changes/archive/ai-service-p0-llmproxy-config-security/specs/ai-service-delta.md`
  - `openspec/changes/archive/ai-service-p1-streaming-cancel-lifecycle/specs/ai-service-delta.md`
  - `openspec/changes/archive/ai-service-p3-judge-quality-pipeline/specs/ai-service-delta.md`
  - `openspec/changes/archive/ai-service-p4-candidates-usage-stats/specs/ai-service-delta.md`
  - `openspec/specs/ai-service/spec.md`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
- Checkpoints:
  - 数据结构：`executionId/runId/traceId` 流式生命周期、`candidates/usage` 字段与 p1/p4 定义一致。
  - IPC 契约：保持统一 envelope `{ ok: true|false, data|error }`，不引入非结构化异常返回。
  - 错误码：现有 `AI_AUTH_FAILED`、`AI_RATE_LIMITED`、`AI_PROVIDER_UNAVAILABLE` 已落地；P5 需新增并贯通 `AI_SESSION_TOKEN_BUDGET_EXCEEDED`。
  - 阈值：沿用并保持 `60 req/min`、`maxTokens<=4096`、会话上限 `200000`、消息容量 `2000`。
- Conclusion: `NO_DRIFT`（与上游 change 假设一致，可进入 Red）

### 2026-02-10 14:05 +0800 依赖安装（worktree）

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `Lockfile is up to date`
  - `Packages: +978`
  - `tsx` 命令可用（后续 Red 复跑验证）

### 2026-02-10 14:06 +0800 Red 首轮（并行时序失败）

- Command:
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/provider-failover-half-open.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/quota-rate-limit-guard.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/ai-provider-unavailable-degrade.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/trace-audit-continuity.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/ai-chat-capacity-guard.test.ts`
- Exit code: `1`
- Key output:
  - 首轮并行时序导致 `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL: Command "tsx" not found`
  - 结论：需在安装完成后复跑 Red 获取行为失败证据

### 2026-02-10 14:09 +0800 Red 复跑（6 场景失败断言）

- Command:
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/provider-failover-half-open.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/quota-rate-limit-guard.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/ai-provider-unavailable-degrade.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/trace-audit-continuity.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/ai-chat-capacity-guard.test.ts`
- Exit code: 全部 `1`
- Key output:
  - S1 失败：`third failure should trigger provider failover and succeed via backup`
  - S2 失败：预算场景断言 `true !== false`（第二次请求未被预算守卫阻断）
  - S3 失败：`LLM_API_ERROR !== AI_PROVIDER_UNAVAILABLE`
  - S4 失败：`degraded run should recover through backup path`
  - S5 失败：`same-session ... serialized`，实际并发 `3 !== 1`
  - S6 失败：容量超限断言 `true !== false`（第 2001 条消息未被阻断）

### 2026-02-10 14:15 +0800 Green 修复（estimateTokenCount 缺失）

- Command:
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/provider-failover-half-open.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/quota-rate-limit-guard.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/ai-provider-unavailable-degrade.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/trace-audit-continuity.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/ai-chat-capacity-guard.test.ts`
- Exit code: `0/0/1/0/0/0`
- Key output:
  - 5 个场景转绿，仅 S3 仍失败：`LLM_API_ERROR !== AI_PROVIDER_UNAVAILABLE`
  - 根因：全 provider 不可用场景错误码未统一映射到 `AI_PROVIDER_UNAVAILABLE`

### 2026-02-10 14:17 +0800 Green 修复（S3 降级错误码统一）

- Command:
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/provider-failover-half-open.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/quota-rate-limit-guard.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/ai-provider-unavailable-degrade.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/trace-audit-continuity.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/ai-chat-capacity-guard.test.ts`
- Exit code: 全部 `0`
- Key output:
  - 6 个 Scenario 映射测试全部通过（S1~S6 全绿）
  - failover/half-open、预算与限流、降级与审计、并发与容量边界均满足断言

### 2026-02-10 14:19 +0800 契约同步（IPC 错误码）

- Command:
  - `pnpm contract:generate`
  - `pnpm contract:check`
- Exit code: `0` / `1`
- Key output:
  - `contract:generate` 成功，`packages/shared/types/ipc-generated.ts` 已同步新增 `AI_SESSION_TOKEN_BUDGET_EXCEEDED`
  - `contract:check` 当前失败为预期开发态：生成文件相对 `HEAD` 存在未提交差异（待提交后复验）

### 2026-02-10 14:23 +0800 门禁回归（预检前）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `pnpm test:integration`
- Exit code: 全部 `0`
- Key output:
  - `typecheck` 通过
  - `lint` 通过（仅存在仓库既有 warning，0 error）
  - `[CROSS_MODULE_GATE] PASS`
  - `test:unit` 通过
  - `test:integration` 通过

### 2026-02-10 14:28 +0800 提交与契约复验

- Command:
  - `git commit -m "feat: harden ai-service failover and quota guards (#388)"`
  - `pnpm contract:check`
- Exit code: `0` / `0`
- Key output:
  - 提交：`353d0449`
  - `contract:check` 通过（`ipc-generated.ts` 已与契约定义一致）

### 2026-02-10 14:29 +0800 推送与创建 PR

- Command:
  - `git push -u origin task/388-ai-service-p5-failover-quota-hardening`
  - `gh pr create --base main --head task/388-ai-service-p5-failover-quota-hardening --title "Harden AI service failover and quota guards (#388)" --body "...Closes #388"`
- Exit code: `0` / `0`
- Key output:
  - 分支已推送并跟踪远端
  - PR 创建成功：`https://github.com/Leeky1017/CreoNow/pull/389`

### 2026-02-10 14:31 +0800 Preflight 首轮（格式检查失败）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - 失败点：`pnpm exec prettier --check ...`
  - 未通过文件：`aiService.ts`、2 个新增 AI 测试、1 个集成测试、Rulebook `proposal/.metadata`
  - 处置：执行 `prettier --write` 后复跑 preflight

### 2026-02-10 14:33 +0800 Preflight 复跑通过

- Command:
  - `pnpm exec prettier --write apps/desktop/main/src/services/ai/__tests__/provider-failover-half-open.test.ts apps/desktop/main/src/services/ai/__tests__/trace-audit-continuity.test.ts apps/desktop/main/src/services/ai/aiService.ts apps/desktop/tests/integration/skill-session-queue-limit.test.ts rulebook/tasks/issue-388-ai-service-p5-failover-quota-hardening/.metadata.json rulebook/tasks/issue-388-ai-service-p5-failover-quota-hardening/proposal.md`
  - `scripts/agent_pr_preflight.sh`
- Exit code: `0` / `0`
- Key output:
  - `prettier --check` 通过
  - preflight 全部通过（`typecheck`、`lint`、`contract:check`、`cross-module:check`、`test:unit`）
