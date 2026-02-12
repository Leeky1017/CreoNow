# ISSUE-416

- Issue: #416
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/416
- Branch: task/416-skill-system-p3-scheduler-concurrency-timeout
- PR: https://github.com/Leeky1017/CreoNow/pull/420
- Scope: 完成交付 `openspec/changes/skill-system-p3-scheduler-concurrency-timeout` 的全部规划任务（调度并发/队列上限/超时中断/依赖缺失阻断/队列状态推送），并按 OpenSpec + Rulebook + GitHub 门禁合并回控制面 `main`
- Out of Scope: 技能市场与分布式调度、`skill-system-p4` 边界硬化、内置技能内容改写

## Plan

- [x] 准入：OPEN issue + task 分支/worktree + Rulebook task
- [x] 规格基线：审阅主 spec/change 文档并完成 Dependency Sync Check
- [x] Red：先写失败测试并记录失败证据
- [x] Green：最小实现通过并补齐 IPC/UI 接线
- [x] Refactor：调度模块独立化并保持回归绿灯
- [ ] preflight + PR auto-merge + main 收口 + cleanup

## Runs

### 2026-02-12 10:09 +0800 准入（Issue / Worktree）

- Command:
  - `gh issue create --title "Deliver skill-system-p3-scheduler-concurrency-timeout change and merge to main" ...`
  - `scripts/agent_controlplane_sync.sh`
  - `scripts/agent_worktree_setup.sh 416 skill-system-p3-scheduler-concurrency-timeout`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/416`
  - Issue 状态：`OPEN`
  - 分支创建：`task/416-skill-system-p3-scheduler-concurrency-timeout`
  - worktree 创建：`.worktrees/issue-416-skill-system-p3-scheduler-concurrency-timeout`

### 2026-02-12 10:12 +0800 Rulebook task 初始化

- Command:
  - `rulebook task create issue-416-skill-system-p3-scheduler-concurrency-timeout`
- Exit code: `0`
- Key output:
  - `Task issue-416-skill-system-p3-scheduler-concurrency-timeout created successfully`

### 2026-02-12 11:20 +0800 Rulebook validate

- Command:
  - `rulebook task validate issue-416-skill-system-p3-scheduler-concurrency-timeout`
- Exit code: `0`
- Key output:
  - `Task issue-416-skill-system-p3-scheduler-concurrency-timeout is valid`
  - Warning: `No spec files found (specs/*/spec.md)`（不阻断）

### 2026-02-12 10:18 +0800 Dependency Sync Check（上游 skill-system-p0/p1/p2）

- Input:
  - `openspec/specs/skill-system/spec.md`
  - `openspec/changes/skill-system-p3-scheduler-concurrency-timeout/{proposal.md,tasks.md,specs/skill-system-delta.md}`
  - `openspec/changes/archive/skill-system-p0-builtin-skills-executor/specs/skill-system-delta.md`
  - `openspec/changes/archive/skill-system-p1-trigger-scope-management/specs/skill-system-delta.md`
  - `openspec/changes/archive/skill-system-p2-custom-skill-crud/specs/skill-system-delta.md`
  - `apps/desktop/main/src/services/skills/{skillExecutor.ts,skillService.ts,skillLoader.ts,skillValidator.ts}`
  - `apps/desktop/main/src/services/ai/aiService.ts`
  - `apps/desktop/main/src/ipc/{ai.ts,contract/ipc-contract.ts}`
- Checkpoints:
  - 数据结构：`skillExecutor.execute -> aiService.runSkill` 参数链路可安全扩展 `timeoutMs` 与 `dependsOn`。
  - IPC 契约：新增错误码 `SKILL_DEPENDENCY_MISSING`/`SKILL_QUEUE_OVERFLOW` 不与既有错误码冲突。
  - executionId 生命周期：runId/executionId 同源，cancel 仍通过 executionId 命中运行中 entry。
  - cancel 机制：timeout/cancel 终态均通过 `done` 事件和可判定错误码返回。
  - 阈值：默认 `30000ms`，最大 `120000ms`，全局并发 `8`，会话队列上限 `20`。
- Conclusion: `NO_DRIFT`

### 2026-02-12 10:24 +0800 Red 失败证据（继续前已在同分支触发）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/skill-executor.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/ai-store-run-request-options.test.ts`
- Exit code: `1` / `1` / `1`
- Key output:
  - 依赖缺失场景未返回 `SKILL_DEPENDENCY_MISSING`。
  - 队列上限/并发上限/超时场景不满足预期断言。
  - renderer store 未将 `SKILL_TIMEOUT` 映射为 `timeout` 状态。

### 2026-02-12 11:04 +0800 Green 后目标测试复核

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/skill-executor.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/ai-store-run-request-options.test.ts`
- Exit code: `0` / `0` / `0`
- Key output:
  - 三组 change 目标测试通过，覆盖依赖缺失阻断、队列并发限制、超时状态映射。

### 2026-02-12 11:07 +0800 门禁复核（fresh）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
- Exit code: `0` / `0` / `0` / `0`
- Key output:
  - `typecheck`: `tsc --noEmit` 通过。
  - `lint`: `eslint . --ext .ts,.tsx` 通过。
  - `cross-module:check`: `[CROSS_MODULE_GATE] PASS`。
  - `test:unit`: 全量单测通过（包含 skill executor 与 ai-service 相关用例）。

### 2026-02-12 11:09 +0800 Contract gate 状态

- Command:
  - `pnpm contract:check`
- Exit code: `1`
- Key output:
  - 失败原因为 `packages/shared/types/ipc-generated.ts` 与 HEAD 存在期望内差异（新增错误码生成结果尚未入提交）。
- Action:
  - 保留生成结果并纳入提交；在 clean 树状态下由 preflight 复核 `contract:check`。

### 2026-02-12 11:21 +0800 Change / Rulebook 归档同步

- Command:
  - `mv openspec/changes/skill-system-p3-scheduler-concurrency-timeout openspec/changes/archive/`
  - 更新 `openspec/changes/EXECUTION_ORDER.md`（活跃 change 6 -> 5，移除 skill-system-p3，时间戳同步）
  - `mv rulebook/tasks/issue-416-skill-system-p3-scheduler-concurrency-timeout rulebook/tasks/archive/2026-02-12-issue-416-skill-system-p3-scheduler-concurrency-timeout`
- Exit code: `0`
- Key output:
  - 本 change 已归档为 `openspec/changes/archive/skill-system-p3-scheduler-concurrency-timeout`
  - Rulebook task 已完成同 PR 自归档

### 2026-02-12 11:23 +0800 Prettier 预检与修复

- Command:
  - `pnpm exec prettier --check <changed-files>`
  - `pnpm exec prettier --write apps/desktop/main/src/services/ai/aiService.ts apps/desktop/main/src/services/skills/skillScheduler.ts apps/desktop/main/src/services/skills/skillValidator.ts rulebook/tasks/archive/2026-02-12-issue-416-skill-system-p3-scheduler-concurrency-timeout/.metadata.json`
  - `pnpm exec prettier --check <changed-files>`
- Exit code: `1` / `0` / `0`
- Key output:
  - 首次检查发现 4 个文件格式漂移，写回后复检通过：`All matched files use Prettier code style!`

### 2026-02-12 11:26 +0800 Fresh 门禁复跑（格式与归档后）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `pnpm contract:generate`
- Exit code: `0` / `0` / `0` / `0` / `0`
- Key output:
  - `typecheck` 通过（`tsc --noEmit`）。
  - `lint` 通过（`eslint . --ext .ts,.tsx`）。
  - `cross-module:check` 通过（`[CROSS_MODULE_GATE] PASS`）。
  - `test:unit` 全量通过。
  - `contract:generate` 成功，`ipc-generated.ts` 与当前 contract 源保持一致。

### 2026-02-12 11:30 +0800 PR 自动流程首次执行（#419）

- Command:
  - `scripts/agent_pr_automerge_and_sync.sh`
- Exit code: `1`
- Key output:
  - 脚本已自动回填 RUN_LOG 的真实 PR 链接并提交：`docs: backfill run log PR link (#416)`。
  - preflight 通过（`typecheck/lint/contract/cross-module/test:unit` 全绿）。
  - auto-merge 等待 checks 时 `windows-e2e` 失败，自动合并中止。

### 2026-02-12 11:34 +0800 CI 失败定位（windows-e2e）

- Command:
  - `gh run view 21932367671 --job 63338979564 --log`
- Exit code: `0`
- Key output:
  - 失败用例：`apps/desktop/tests/e2e/ai-runtime.spec.ts` 的 `ai runtime: timeout maps to TIMEOUT`。
  - 断言失败：期望 `ai-error-code` 包含 `TIMEOUT`，实际未出现该元素。
  - 根因：
    - 本 change 将错误码统一为 `SKILL_TIMEOUT`；
    - `runSkill` 默认超时从环境值解耦后，E2E 用例设置 `CREONOW_AI_TIMEOUT_MS=200` 不再触发超时路径。

### 2026-02-12 11:40 +0800 CI 修复与本地复核

- Command:
  - 更新 `apps/desktop/main/src/services/ai/aiService.ts`：显式环境超时作为 skill timeout 回退值（无 `timeoutMs` 时）；
  - 更新 `apps/desktop/renderer/src/features/ai/AiPanel.tsx`：`SKILL_TIMEOUT` 显示为 timeout 类型；
  - 更新 `apps/desktop/tests/e2e/ai-runtime.spec.ts`：断言改为 `SKILL_TIMEOUT`；
  - `pnpm exec prettier --check apps/desktop/main/src/services/ai/aiService.ts apps/desktop/renderer/src/features/ai/AiPanel.tsx apps/desktop/tests/e2e/ai-runtime.spec.ts`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test:unit`
  - `pnpm contract:check`
  - `pnpm exec tsx apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/ai-store-run-request-options.test.ts`
- Exit code: `0`（`apps/desktop test:run tests/e2e/ai-runtime.spec.ts --project=chromium` 在本地不适用，已跳过）
- Key output:
  - 本地编译、lint、单测、契约检查与关键回归用例均通过。
  - 将重新 push 并重跑 auto-merge 流程，等待 `windows-e2e` 复绿。
