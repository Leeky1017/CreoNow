# ISSUE-380

- Issue: #380
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/380
- Branch: task/380-ai-service-p4-candidates-usage-stats
- PR: (待回填)
- Scope: 交付 `openspec/changes/ai-service-p4-candidates-usage-stats` 全部任务（候选方案配置与应用、全部不满意重生成与强负反馈、token/费用统计展示）
- Out of Scope: provider 健康探测与自动降级切换（属于 `ai-service-p5-failover-quota-hardening`）

## Plan

- [x] 准入：创建 OPEN issue + task branch + worktree
- [x] 创建并 validate Rulebook task
- [x] 完成 Dependency Sync Check 并落盘 `NO_DRIFT`
- [x] Red：S1-S4 失败测试证据
- [x] Green：候选/重生成/统计最小实现
- [x] Refactor：类型收敛与回归验证
- [ ] preflight 通过
- [ ] PR + auto-merge + main 收口 + worktree 清理

## Runs

### 2026-02-10 13:05 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `gh issue create --title "ai-service-p4-candidates-usage-stats" --body "..."`
  - `scripts/agent_controlplane_sync.sh`
  - `scripts/agent_worktree_setup.sh 380 ai-service-p4-candidates-usage-stats`
  - `rulebook task create issue-380-ai-service-p4-candidates-usage-stats`
  - `rulebook task validate issue-380-ai-service-p4-candidates-usage-stats`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/380`
  - Worktree 创建成功：`.worktrees/issue-380-ai-service-p4-candidates-usage-stats`
  - Rulebook task 已创建并通过 validate

### 2026-02-10 13:08 +0800 Dependency Sync Check（依赖 ai-service-p2）

- Input:
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/changes/archive/ai-service-p2-panel-chat-apply-flow/specs/ai-service-delta.md`
  - `openspec/changes/archive/ai-service-p2-panel-chat-apply-flow/tasks.md`
  - `openspec/specs/ai-service/spec.md`
  - `apps/desktop/main/src/ipc/ai.ts`
  - `apps/desktop/renderer/src/features/ai/AiPanel.tsx`
- Checkpoints:
  - 数据结构：`ai:chat:*`、`runId/executionId` 语义保持，P4 仅扩展候选与 usage metadata。
  - IPC 契约：保留 `ai:chat:list|send|clear` 与 `ai:skill:run` 既有通道，不改变包络 `{ ok, data|error }`。
  - 错误码：复用 `INVALID_ARGUMENT`、`INTERNAL`、`NOT_FOUND`、`AI_RATE_LIMITED`，不引入冲突码。
  - 阈值：不调整 p2/p1 既有流式取消与限流阈值；P4 仅新增展示统计口径。
- Conclusion: `NO_DRIFT`

### 2026-02-10 13:09 +0800 Red 前置（worktree 依赖安装）

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `Lockfile is up to date`
  - `Packages: +978`
  - `tsx` / `vitest` 可执行恢复

### 2026-02-10 13:10 +0800 Red（S1-S4 失败测试）

- Command:
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/ai/__tests__/candidate-apply-flow.test.tsx`
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/ai/__tests__/usage-stats-render.test.tsx renderer/src/features/ai/__tests__/usage-stats-no-price.test.tsx`
  - `pnpm exec tsx apps/desktop/tests/integration/ai-candidate-regenerate-feedback.test.ts`
- Exit code: `1`
- Key output:
  - S1 失败：`Unable to find an element by: [data-testid="ai-candidate-card-2"]`
  - S3/S4 失败：`Unable to find an element by: [data-testid="ai-usage-prompt-tokens"]`
  - S2 失败：`AssertionError ... undefined !== 3`（`ai:skill:run` 未透传 `candidateCount`）

### 2026-02-10 13:19 +0800 Green 修复补充（S1 稳定断言）

- Command:
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/ai/__tests__/candidate-apply-flow.test.tsx`
- Exit code: `0`
- Key output:
  - `✓ candidate-apply-flow.test.tsx (1 test)`
  - 断言改为「点击候选后 `setSelectedCandidateId(\"candidate-b\")` 被调用」+ 最终 `persistAiApply` 使用 `run-b`

### 2026-02-10 13:19 +0800 Refactor 回归（P4 相关场景）

- Command:
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/ai/__tests__/usage-stats-render.test.tsx renderer/src/features/ai/__tests__/usage-stats-no-price.test.tsx renderer/src/features/ai/__tests__/candidate-apply-flow.test.tsx renderer/src/features/ai/__tests__/apply-to-editor-inline-diff.test.tsx renderer/src/features/ai/AiPanel.test.tsx`
  - `pnpm exec tsx apps/desktop/tests/integration/ai-candidate-regenerate-feedback.test.ts`
- Exit code: `0`
- Key output:
  - `Test Files 5 passed (5), Tests 18 passed (18)`
  - `ai-candidate-regenerate-feedback` 集成脚本退出码 `0`
  - 仅出现既有 React `act(...)` warning，不影响断言通过与退出状态

### 2026-02-10 13:21 +0800 合同同步验证

- Command:
  - `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - `tsx scripts/contract-generate.ts` 成功执行，`packages/shared/types/ipc-generated.ts` 与主进程 contract 同步

### 2026-02-10 13:23 +0800 归档与执行顺序同步

- Command:
  - `mv openspec/changes/ai-service-p4-candidates-usage-stats openspec/changes/archive/`
  - `rulebook task archive issue-380-ai-service-p4-candidates-usage-stats`
  - 更新 `openspec/changes/EXECUTION_ORDER.md`（活跃 change 由 4 → 3，更新时间 `2026-02-10 13:23`）
- Exit code: `0`
- Key output:
  - `✅ Task issue-380-ai-service-p4-candidates-usage-stats archived successfully`
  - 活跃拓扑更新为：`context-engine-p4-hardening-boundary`、`search-retrieval-p4-hardening-boundary`、`ai-service-p5-failover-quota-hardening`

### 2026-02-10 13:24 +0800 本地门禁预检（提交前）

- Command:
  - `pnpm typecheck && pnpm lint && pnpm contract:check && pnpm cross-module:check && pnpm test:unit`
  - `pnpm cross-module:check && pnpm test:unit`
- Exit code:
  - 第一条命令 `1`（`contract:check` 在未提交工作区状态下出现 `packages/shared/types/ipc-generated.ts` diff，符合脚本行为）
  - 第二条命令 `0`
- Key output:
  - `typecheck` 通过；`lint` 仅 legacy warning，无 error。
  - `[CROSS_MODULE_GATE] PASS`
  - `test:unit` 全部通过（含 AI/IPC/Context/Memory 等单元套件）
