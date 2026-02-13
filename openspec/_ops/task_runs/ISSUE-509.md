# ISSUE-509

- Issue: #509
- Branch: task/509-ai-runtime-identity-tests
- PR: TBA

## Plan

- 先以 TDD 方式把 identity prompt 接入 `aiService` 运行时请求组装链路
- 补齐 stream timeout done 与全层 fetcher 降级的自动化回归测试
- 保持 `pnpm test:unit`、`pnpm test:integration`、`pnpm cross-module:check` 全绿

## Runs

### 2026-02-13 13:43 任务准入与规格落地

- Command: `gh issue create --title "Integrate identity prompt into runtime and add AI degradation regression tests" ...`
- Key output: 创建 OPEN issue `#509`

- Command: `git fetch origin && git worktree add .worktrees/issue-509-ai-runtime-identity-tests -b task/509-ai-runtime-identity-tests origin/main`
- Key output: 新建并切换隔离 worktree，基于 `origin/main`

- Command: 读取规范与模板
  - `AGENTS.md`
  - `openspec/project.md`
  - `openspec/specs/ai-service/spec.md`
  - `openspec/specs/context-engine/spec.md`
  - `openspec/changes/_template/*`
- Key output: 完成 Spec-First 与 TDD 前置准备

- Command: 编写变更与任务文档
  - `rulebook/tasks/issue-509-ai-runtime-identity-tests/*`
  - `openspec/changes/issue-509-ai-runtime-identity-tests/*`
  - `openspec/changes/EXECUTION_ORDER.md`
- Key output: 建立 active change 与 Scenario→测试映射，等待进入 Red

### 2026-02-13 13:46 Rulebook 校验与环境准备

- Command: `rulebook task validate issue-509-ai-runtime-identity-tests`
- Key output: `✅ Task issue-509-ai-runtime-identity-tests is valid`（初次校验通过）

- Command: `pnpm install --frozen-lockfile`
- Key output: 依赖安装完成；`tsx` 可用（此前 Red 命令因 `tsx not found` 被阻断）

### 2026-02-13 13:48 Red（先失败）

- Command: `pnpm tsx apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts`
- Key output:
  - `AssertionError [ERR_ASSERTION]: runtime non-stream system prompt must include identity layer`
  - Red 结论：运行时 system prompt 未注入 identity，失败符合预期

### 2026-02-13 13:50 Green（最小实现 + 定向回归）

- Command: 修改实现与测试
  - `apps/desktop/main/src/services/ai/aiService.ts`
  - `apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts`
  - `apps/desktop/tests/integration/ai-stream-lifecycle.test.ts`
  - `apps/desktop/tests/unit/context/layer-degrade-warning.test.ts`
- Key output:
  - 运行时请求改为 `assembleSystemPrompt + GLOBAL_IDENTITY_PROMPT` 组装
  - 新增 AIS-TIMEOUT-S1 与 CE-DEGRADE-S1 自动化场景

- Command:
  - `pnpm tsx apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts`
  - `pnpm tsx apps/desktop/tests/integration/ai-stream-lifecycle.test.ts`
  - `pnpm tsx apps/desktop/tests/unit/context/layer-degrade-warning.test.ts`
- Key output: 定向测试全部通过（exit code 0）

### 2026-02-13 13:52 全量门禁复核

- Command: `pnpm test:unit`
- Key output: 全量单测通过（exit code 0）

- Command: `pnpm test:integration`
- Key output: 全量集成测试通过（exit code 0）

- Command: `pnpm cross-module:check`
- Key output: `[CROSS_MODULE_GATE] PASS`

- Command: `pnpm typecheck`
- Key output: `tsc --noEmit` 通过（exit code 0）

- Command: `rulebook task validate issue-509-ai-runtime-identity-tests`
- Key output: 任务结构校验通过（补齐 `rulebook/tasks/.../specs/*/spec.md` 后无 warning）

### 2026-02-13 14:00 OpenSpec 归档与执行顺序同步

- Command: `mv openspec/changes/issue-509-ai-runtime-identity-tests openspec/changes/archive/issue-509-ai-runtime-identity-tests`
- Key output: 已完成 change 归档，满足“已全勾选 active change 必须归档”门禁要求

- Command: 更新路径与顺序文档
  - `rulebook/tasks/issue-509-ai-runtime-identity-tests/specs/ai-service/spec.md`
  - `rulebook/tasks/issue-509-ai-runtime-identity-tests/specs/context-engine/spec.md`
  - `openspec/changes/EXECUTION_ORDER.md`
- Key output:
  - Rulebook spec 链接改为 archive 路径
  - `EXECUTION_ORDER.md` 同步为“0 active change”

### 2026-02-13 14:01 完成前复验（fresh evidence）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `pnpm test:integration`
  - `rulebook task validate issue-509-ai-runtime-identity-tests`
- Key output:
  - 全部命令 exit code 0
  - `cross-module:check` 输出 `[CROSS_MODULE_GATE] PASS`
  - Rulebook task 持续 `✅ valid`
