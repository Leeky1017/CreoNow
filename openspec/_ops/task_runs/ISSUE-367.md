# ISSUE-367

- Issue: #367
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/367
- Branch: task/367-ai-service-p2-panel-chat-apply-flow
- PR: https://github.com/Leeky1017/CreoNow/pull/371
- Scope: 完成交付 `openspec/changes/ai-service-p2-panel-chat-apply-flow`（chat IPC 项目隔离、应用到编辑器 Inline Diff 确认链路、AiPanel Storybook 四态），并按治理流程合并回控制面 `main`
- Out of Scope: Judge 质量评估、多候选方案、用量统计

## Plan

- [x] 准入：创建 OPEN issue + task branch + worktree
- [x] Rulebook task 创建并通过 validate
- [x] Dependency Sync Check（上游 `ai-service-p1`）结论 `NO_DRIFT`
- [x] Red：S1/S2/S3 失败测试证据落盘
- [x] Green：实现 chat 隔离 + Inline Diff 应用确认 + Story 四态
- [x] Refactor：收敛状态/契约并保持全绿
- [x] preflight 全绿
- [ ] PR + auto-merge + main 收口 + worktree 清理

## Runs

### 2026-02-10 11:00 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `scripts/agent_controlplane_sync.sh`
  - `gh issue create --title "Deliver ai-service-p2-panel-chat-apply-flow" --body-file /tmp/issue-ai-service-p2-panel-chat-apply-flow.md`
  - `scripts/agent_worktree_setup.sh 367 ai-service-p2-panel-chat-apply-flow`
  - `rulebook task create issue-367-ai-service-p2-panel-chat-apply-flow`
  - `rulebook task validate issue-367-ai-service-p2-panel-chat-apply-flow`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/367`
  - Worktree 创建成功：`.worktrees/issue-367-ai-service-p2-panel-chat-apply-flow`
  - Rulebook task 创建并通过 validate

### 2026-02-10 11:03 +0800 Dependency Sync Check（AI Service P2）

- Input:
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/changes/archive/ai-service-p1-streaming-cancel-lifecycle/**`
  - `openspec/specs/ai-service/spec.md`
  - `openspec/specs/ipc/spec.md`
  - `openspec/changes/ai-service-p2-panel-chat-apply-flow/specs/ai-service-delta.md`
- Checkpoints:
  - 数据结构：聊天消息沿用 `role/content/skillId/timestamp/traceId`；新增存储不改变 p1 的 `executionId/runId` 流式结构
  - IPC 契约：新增 `ai:chat:list|clear` 且保持 Request-Response `{ ok, data|error }` 包络
  - 错误码：复用 `INVALID_ARGUMENT`、`INTERNAL`、`CONFLICT`、`AI_NOT_CONFIGURED`；不新增 breaking 错误码
  - 阈值：不调整 p1 的流式推送限流、超时与取消语义
- Conclusion: `NO_DRIFT`

### 2026-02-10 11:06 +0800 Red 准备（worktree 依赖安装）

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `Lockfile is up to date`
  - worktree 安装完成，恢复 `tsx`/`vitest` 可执行环境

### 2026-02-10 11:08 +0800 Red（先写失败测试）

- Command:
  - `pnpm exec tsx apps/desktop/main/src/ipc/__tests__/ai-chat-project-isolation.test.ts`
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/ai/__tests__/apply-to-editor-inline-diff.test.tsx`
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/ai/AiPanel.stories.test.ts`
- Exit code: `1`
- Key output:
  - S1 失败：`expected ai:chat:list handler to be registered`
  - S2 失败：`persistAiApply` 在首次点击 `ai-apply` 时已被调用（未经过确认态）
  - S3 失败：`expected undefined to be defined`（`EmptyState` 缺失）

### 2026-02-10 11:12 +0800 Green（最小实现）

- Command:
  - `apply_patch`（新增 `ai:chat:list|clear` + 项目隔离存储，更新 `ai:chat:send`）
  - `apply_patch`（更新 IPC contract：新增 `ai:chat:list|clear`，`ai:chat:send.projectId` 改为必填）
  - `apply_patch`（`AiPanel` 改为“Inline Diff 预览 -> Confirm Apply -> 持久化”两步流，空态文案对齐）
  - `apply_patch`（补齐 `AiPanel.stories.test.ts` 期望的 `EmptyState/GeneratingState` 导出）
  - `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - chat IPC 三通道全部可注册并按 `projectId` 隔离
  - `Apply` 首击不再落盘，进入确认态后才执行 `persistAiApply`
  - Storybook 四态导出满足单测约束

### 2026-02-10 11:14 +0800 Green 验证（场景回归）

- Command:
  - `pnpm exec tsx apps/desktop/main/src/ipc/__tests__/ai-chat-project-isolation.test.ts`
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/ai/__tests__/apply-to-editor-inline-diff.test.tsx renderer/src/features/ai/AiPanel.stories.test.ts`
- Exit code: `0`
- Key output:
  - S1/S2/S3 三条场景测试全部转绿

### 2026-02-10 11:16 +0800 Refactor + 门禁前验证

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `pnpm test:integration`
  - `git mv openspec/changes/ai-service-p2-panel-chat-apply-flow openspec/changes/archive/ai-service-p2-panel-chat-apply-flow`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - `typecheck` 通过
  - `lint` 0 error（仅历史 warning）
  - `cross-module:check` `PASS`
  - `test:unit` / `test:integration` 全通过
  - change 已归档，`EXECUTION_ORDER.md` 已同步更新时间与拓扑

### 2026-02-10 11:19 +0800 preflight 全绿

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `0`
- Key output:
  - Repo/Issue/Rulebook/Workspace/OpenSpec 校验通过
  - `prettier --check`、`typecheck`、`lint`、`contract:check`、`cross-module:check`、`test:unit` 全通过
  - `lint` 仅历史 warning，无新增 error

### 2026-02-10 11:32 +0800 PR checks 复核（发现 CI 阻塞）

- Command:
  - `gh pr view 371 --json number,state,mergeStateStatus,autoMergeRequest,statusCheckRollup,url`
- Exit code: `0`
- Key output:
  - PR `#371` 为 `OPEN`，auto-merge 已开启
  - required checks 中 `openspec-log-guard`、`merge-serial` 通过
  - `ci` 因 `windows-e2e` 失败被阻塞（job `63055958583`）

### 2026-02-10 11:35 +0800 Red（E2E 失败复现）

- Command:
  - `pnpm -C apps/desktop build`
  - `pnpm -C apps/desktop rebuild:native`
  - `pnpm -C apps/desktop exec playwright test -c tests/e2e/playwright.config.ts tests/e2e/ai-apply.spec.ts`
- Exit code: `1`
- Key output:
  - 失败 1：`expect(getByTestId('ai-apply-status')).toBeVisible()` 超时（旧单击 apply 断言失效）
  - 失败 2：冲突路径在确认前流程不再落盘，旧断言链路与两步确认不一致

### 2026-02-10 11:39 +0800 Green（修复 windows-e2e 两步确认断言）

- Command:
  - `apply_patch apps/desktop/tests/e2e/ai-apply.spec.ts`（success/conflict 两条路径均改为 `ai-apply` -> `ai-apply-confirm`）
  - `pnpm -C apps/desktop exec playwright test -c tests/e2e/playwright.config.ts tests/e2e/ai-apply.spec.ts`
- Exit code: `0`
- Key output:
  - `2 passed`（`ai-apply` 成功链路与冲突链路均通过）
  - E2E 与 P2 规范「先预览 diff，再 Confirm Apply 持久化」一致

### 2026-02-10 11:43 +0800 preflight 复验（首次失败）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - 失败点：`pnpm test:unit` 中 `better-sqlite3` ABI 不匹配
  - 错误：`NODE_MODULE_VERSION 143`（Electron）与 Node 运行时要求 `115` 不一致

### 2026-02-10 11:45 +0800 preflight 复验（修复后通过）

- Command:
  - `pnpm -C apps/desktop rebuild better-sqlite3`
  - `scripts/agent_pr_preflight.sh`
- Exit code: `0`
- Key output:
  - `test:unit` 恢复通过
  - preflight 全链路通过（保留既有 lint warnings，无新增 error）
