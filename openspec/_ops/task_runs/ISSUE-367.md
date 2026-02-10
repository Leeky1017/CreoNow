# ISSUE-367

- Issue: #367
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/367
- Branch: task/367-ai-service-p2-panel-chat-apply-flow
- PR: https://github.com/Leeky1017/CreoNow/pull/0
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
