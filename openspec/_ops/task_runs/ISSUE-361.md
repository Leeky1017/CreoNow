# ISSUE-361

- Issue: #361
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/361
- Branch: task/361-ai-service-p1-streaming-cancel-lifecycle
- PR: https://github.com/Leeky1017/CreoNow/pull/363
- Scope: 完成交付 `openspec/changes/ai-service-p1-streaming-cancel-lifecycle`（流式生命周期、取消优先竞态、网络中断完整 prompt 重放），并按治理流程合并到控制面 `main`
- Out of Scope: AI 面板聊天持久化、Judge 质量评估、p2/p3/p4/p5 范围改动

## Plan

- [x] 准入：创建 OPEN issue + task branch + worktree
- [x] Rulebook task 创建并 validate
- [x] Dependency Sync Check（上游 `ai-service-p0`）结论 `NO_DRIFT`
- [x] Red：S1/S2 失败测试证据落盘
- [x] Green：生命周期状态机 + 取消优先 + 网络中断完整重放
- [x] Refactor：协议/状态机整理并保持回归全绿
- [ ] preflight 全绿
- [ ] PR + auto-merge + main 收口 + worktree 清理

## Runs

### 2026-02-10 00:00 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `scripts/agent_controlplane_sync.sh`
  - `gh issue create --title "Deliver ai-service-p1-streaming-cancel-lifecycle" --body-file /tmp/issue-ai-service-p1-streaming-cancel-lifecycle.md`
  - `scripts/agent_worktree_setup.sh 361 ai-service-p1-streaming-cancel-lifecycle`
  - `rulebook task create issue-361-ai-service-p1-streaming-cancel-lifecycle`
  - `rulebook task validate issue-361-ai-service-p1-streaming-cancel-lifecycle`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/361`
  - worktree 创建成功：`.worktrees/issue-361-ai-service-p1-streaming-cancel-lifecycle`
  - Rulebook task 创建并通过 validate

### 2026-02-10 00:02 +0800 Dependency Sync Check（AI Service P1）

- Input:
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/changes/archive/ai-service-p0-llmproxy-config-security/**`
  - `openspec/specs/ai-service/spec.md`
  - `openspec/specs/skill-system/spec.md`
  - `openspec/specs/ipc/spec.md`
- Checkpoints:
  - 数据结构：`executionId`/`traceId`/chunk `seq`/done `terminal` 与现有 `runId` 兼容迁移
  - IPC 契约：沿用 `skill:stream:chunk` 与 `skill:stream:done`，不新增通道
  - 错误码：沿用 `LLM_API_ERROR`、`AI_RATE_LIMITED`、`TIMEOUT`，done 终态区分 `error`
  - 阈值：不修改现有 TTFT/chunk 延迟指标与限流阈值
- Conclusion: `NO_DRIFT`

### 2026-02-10 00:08 +0800 Red（先写失败测试）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/ai-stream-lifecycle.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/ai-stream-race-cancel-priority.test.ts`
- Exit code: `1`
- Key output:
  - S1 失败：`expected executionId to be string`（旧实现仅返回 `runId`）
  - S2 失败：`timeout waiting for done event`（旧事件模型无 `done terminal` 收敛）

### 2026-02-10 00:10 +0800 Green（最小实现）

- Command:
  - `apply_patch`（更新 `packages/shared/types/ai.ts`、`aiService.ts`、`ipc/ai.ts`、`pushBackpressure.ts`、`useAiStream.ts`、`aiStore.ts`）
  - `apply_patch`（更新 `ipc-contract.ts`、新增 2 个集成测试、修正受影响单测）
  - `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - `ai:skill:run` 返回 `executionId` + `runId`
  - 流式协议收敛到 `chunk/done`，done 终态固定 `completed|cancelled|error`
  - 取消/完成竞态改为取消优先（完成延后一拍收敛）
  - 网络断流增加完整 prompt 重放路径（非断点续传）

### 2026-02-10 00:14 +0800 Green 验证（S1/S2 转绿）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/ai-stream-lifecycle.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/ai-stream-race-cancel-priority.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/ai-store-run-request-options.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/ipc-push-backpressure.spec.ts`
- Exit code: `0`
- Key output:
  - S1/S2 均通过
  - store 与 push backpressure 受影响单测通过

### 2026-02-10 00:20 +0800 全量验证链（含修复）

- Command:
  - `pnpm test:integration`
  - `pnpm typecheck && pnpm lint && pnpm contract:check && pnpm cross-module:check && pnpm test:unit`
  - `apply_patch apps/desktop/tests/integration/ai-stream-race-cancel-priority.test.ts`（修复类型收窄）
  - `apply_patch apps/desktop/main/src/services/ai/aiService.ts`（`while(true)` -> `for(;;)`，通过 lint）
  - `pnpm typecheck && pnpm lint`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
- Exit code:
  - `pnpm test:integration` => `0`
  - 首轮 `typecheck/lint/...` => `1`（先后出现 TS + lint 实错）
  - 修复后二轮 `typecheck/lint` => `0`
  - `cross-module:check` => `0`
  - `test:unit` => `0`
- Key output:
  - 首轮 TS 失败：`ai-stream-race-cancel-priority.test.ts` 类型守卫不足
  - 首轮 lint 实错：`aiService.ts` `no-constant-condition`
  - 修复后全部转绿

### 2026-02-10 00:34 +0800 Change 收口（任务勾选 + 归档 + 执行顺序同步）

- Command:
  - `perl -0pi -e 's/- [ ]/- [x]/g' openspec/changes/ai-service-p1-streaming-cancel-lifecycle/tasks.md`
  - `git mv openspec/changes/ai-service-p1-streaming-cancel-lifecycle openspec/changes/archive/ai-service-p1-streaming-cancel-lifecycle`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
  - `python3`（active change 覆盖检查）
- Exit code: `0`
- Key output:
  - `ai-service-p1-streaming-cancel-lifecycle` 已归档到 `openspec/changes/archive/`
  - `EXECUTION_ORDER.md` 更新为 12 个活跃 change，更新时间 `2026-02-10 00:34`
  - active change 在顺序文档中无缺漏

### 2026-02-10 00:25 +0800 验证链复核（提交前）

- Command:
  - `pnpm test:integration`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `pnpm exec prettier --check $(git diff --name-only --diff-filter=ACMR)`
- Exit code:
  - `pnpm test:integration` => `0`
  - `pnpm typecheck` => `0`
  - `pnpm lint` => `0`（仅历史 warning）
  - `pnpm contract:check` => `1`（未提交改动时 `ipc-generated.ts` diff 触发，预期）
  - `pnpm cross-module:check` => `0`
  - `pnpm test:unit` => `0`
  - `pnpm exec prettier --check ...` => `0`
- Key output:
  - 集成测试与单元测试全通过
  - 类型与静态检查通过（无 lint error）
  - `contract:check` 在“工作区含未提交生成物”阶段触发 diff，待提交后由 preflight 在 clean HEAD 复核

### 2026-02-10 00:26 +0800 Rulebook 校验

- Command:
  - `rulebook task validate issue-361-ai-service-p1-streaming-cancel-lifecycle`
- Exit code: `0`
- Key output:
  - task validate 通过（warning: `No spec files found`，与当前任务结构一致）
