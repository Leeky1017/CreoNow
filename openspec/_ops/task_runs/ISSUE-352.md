# ISSUE-352

- Issue: #352
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/352
- Branch: task/352-ai-service-p0-llmproxy-config-security
- PR: (待回填)
- Scope: 完成 change `openspec/changes/ai-service-p0-llmproxy-config-security`（`ai:config:*` 契约、安全存储、重试与限流基线）并按治理流程合并到控制面 `main`
- Out of Scope: 流式生命周期状态机（P1）、AI 面板聊天应用流（P2）、Judge 流程（P3）、候选方案与统计（P4/P5）

## Plan

- [x] 准入：创建 OPEN issue + task branch + worktree
- [x] Rulebook task 创建并 validate 通过
- [x] Red：S1/S2/S3 失败测试证据落盘
- [x] Green：实现安全存储、`ai:config:*`、重试与限流基线
- [x] Refactor：契约与调用方同步、测试接入 `pnpm test:unit`
- [ ] preflight 全绿
- [ ] PR + required checks + auto-merge + main 收口
- [ ] change/archive 收口 + Rulebook 自归档 + worktree 清理

## Runs

### 2026-02-09 22:23 +0800 准入与环境隔离

- Command:
  - `scripts/agent_controlplane_sync.sh`
  - `gh issue create --title "Deliver ai-service-p0-llmproxy-config-security" ...`
  - `gh issue edit 352 --body-file -`
  - `scripts/agent_worktree_setup.sh 352 ai-service-p0-llmproxy-config-security`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/352`
  - worktree 创建成功：`.worktrees/issue-352-ai-service-p0-llmproxy-config-security`

### 2026-02-09 22:26 +0800 Rulebook admission

- Command:
  - `rulebook task create issue-352-ai-service-p0-llmproxy-config-security`
  - `rulebook task validate issue-352-ai-service-p0-llmproxy-config-security`
- Exit code: `0`
- Key output:
  - task 创建并通过 validate

### 2026-02-09 22:28 +0800 Red（先写失败测试）

- Command:
  - `pnpm install --frozen-lockfile`
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/llm-proxy-config.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/llm-proxy-retry-rate-limit.test.ts`
- Exit code: `1`
- Key output:
  - S1 失败：`API key must not be persisted as plaintext (safeStorage encrypted)`
  - S2 失败：`expected IPC handler ai:config:test to be registered`
  - S3 失败：`network flake should recover by retry`

### 2026-02-09 22:36 +0800 Green（最小实现通过）

- Command:
  - `apply_patch apps/desktop/main/src/services/ai/aiProxySettingsService.ts`
  - `apply_patch apps/desktop/main/src/ipc/aiProxy.ts`
  - `apply_patch apps/desktop/main/src/ipc/ai.ts`
  - `apply_patch apps/desktop/main/src/index.ts`
  - `apply_patch apps/desktop/main/src/services/ai/aiService.ts`
  - `apply_patch apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apply_patch apps/desktop/renderer/src/features/settings/ProxySection.tsx`
  - `apply_patch apps/desktop/renderer/src/features/ai/AiPanel.tsx`
  - `apply_patch apps/desktop/tests/unit/ai-upstream-error-mapping.test.ts`
  - `apply_patch apps/desktop/tests/unit/ai-service-model-catalog.test.ts`
  - `apply_patch apps/desktop/tests/unit/ai-service-run-options.test.ts`
  - `apply_patch apps/desktop/tests/e2e/ai-runtime.spec.ts`
  - `apply_patch package.json`
  - `pnpm contract:generate`
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/llm-proxy-config.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/llm-proxy-retry-rate-limit.test.ts`
- Exit code: `0`
- Key output:
  - `ai:config:get|update|test` IPC 通道落地并替换旧 `ai:proxy*`
  - API Key 存储改为 `safeStorage` 加密路径，`get` 返回脱敏配置
  - AI 调用增加默认 `60 req/min` 限流与 `1s/2s/4s` 网络重试
  - S1/S2/S3 三个用例全部转绿

### 2026-02-09 22:40 +0800 Refactor 与门禁验证

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/ai-upstream-error-mapping.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/ai-service-model-catalog.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/ai-service-run-options.test.ts`
  - `pnpm test:unit`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm cross-module:check`
- Exit code: `0`
- Key output:
  - `pnpm test:unit` 全绿（已包含新增 3 个 P0 测试）
  - `typecheck` 通过
  - `lint` 仅既有 warning（无 error）
  - `cross-module:check` 通过

### 2026-02-09 22:41 +0800 契约一致性复核

- Command:
  - `pnpm contract:check`
- Exit code: `1`
- Key output:
  - 因 `packages/shared/types/ipc-generated.ts` 发生预期更新而显示 diff（尚未提交）
  - 待提交后在 preflight 阶段复核为绿

### 2026-02-09 22:45 +0800 OpenSpec change 归档与顺序同步

- Command:
  - `perl -0pi -e 's/- \[ \]/- [x]/g' openspec/changes/ai-service-p0-llmproxy-config-security/tasks.md`
  - `mv openspec/changes/ai-service-p0-llmproxy-config-security openspec/changes/archive/`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
  - `python3 - <<'PY' ... active changes completeness check ... PY`
- Exit code: `0`
- Key output:
  - `ai-service-p0-llmproxy-config-security` 已从 active 迁移到 `openspec/changes/archive/`
  - `EXECUTION_ORDER.md` 已同步（活跃数量 `16 -> 15`，更新时间 `2026-02-09 22:45`）
  - 所有 active change 均在执行顺序文档中可定位

### 2026-02-09 22:46 +0800 Rulebook 文档完善

- Command:
  - `apply_patch rulebook/tasks/issue-352-ai-service-p0-llmproxy-config-security/proposal.md`
  - `apply_patch rulebook/tasks/issue-352-ai-service-p0-llmproxy-config-security/tasks.md`
  - `rulebook task validate issue-352-ai-service-p0-llmproxy-config-security`
- Exit code: `0`
- Key output:
  - Rulebook task 结构通过 validate
  - Warning：`No spec files found (specs/*/spec.md)`（不阻断）
