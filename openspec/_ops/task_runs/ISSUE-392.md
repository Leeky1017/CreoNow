# ISSUE-392

- Issue: #392
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/392
- Branch: task/392-skill-system-p0-builtin-skills-executor
- PR: https://github.com/Leeky1017/CreoNow/pull/396
- Scope: 交付 `openspec/changes/skill-system-p0-builtin-skills-executor`，完成 8 个 builtin skills、SkillExecutor、执行/流式/取消链路、错误语义、测试与归档收口。
- Out of Scope: 技能面板交互增强、自定义技能 CRUD、作用域管理、调度并发/超时硬化（由后续 `skill-system-p1~p4` 承接）。

## Plan

- [x] 准入：OPEN issue + task worktree + Rulebook task validate
- [x] Dependency Sync Check：核对 AI Service / Context Engine / IPC 上游契约并记录结论
- [x] Red：先写失败测试并记录输出证据
- [x] Green：最小实现通过并保持接口兼容
- [x] Refactor：统一事件与结果结构，保持绿灯
- [ ] 门禁：typecheck/lint/contract/cross-module/unit/preflight
- [ ] PR + auto-merge + main 收口 + change/rulebook 归档 + worktree 清理

## Runs

### 2026-02-10 16:53 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `scripts/agent_controlplane_sync.sh`
  - `gh issue create --title "Skill System P0: Builtin skills executor" --body-file -`
  - `scripts/agent_worktree_setup.sh 392 skill-system-p0-builtin-skills-executor`
  - `rulebook task create issue-392-skill-system-p0-builtin-skills-executor`
  - `rulebook task validate issue-392-skill-system-p0-builtin-skills-executor`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/392`
  - worktree 创建成功：`.worktrees/issue-392-skill-system-p0-builtin-skills-executor`
  - Rulebook task 校验通过：`issue-392-skill-system-p0-builtin-skills-executor`

### 2026-02-10 17:02 +0800 Dependency Sync Check（进入 Red 前）

- Input:
  - `openspec/changes/archive/ai-service-p1-streaming-cancel-lifecycle/specs/ai-service-delta.md`
  - `openspec/changes/archive/context-engine-p3-constraints-rules-injection/specs/context-engine-delta.md`
  - `openspec/changes/archive/ipc-p0-contract-ssot-and-codegen/specs/ipc/spec.md`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `openspec/guards/cross-module-contract-baseline.json`
- Checkpoints:
  - 数据结构：维持 `runId/executionId/traceId` 执行生命周期主键，不引入并发调度字段（P3 承接）。
  - IPC 契约：执行/取消通道采用三段式命名治理（`ai:skill:run` / `ai:skill:cancel`），流式推送继续 `skill:stream:chunk|done`。
  - 错误码：沿用 `LLM_API_ERROR`、`TIMEOUT`，新增输入前置错误 `SKILL_INPUT_EMPTY`。
  - 阈值：不改动 AI Service 既有限额与超时阈值（避免越权进入 P3/P4 范围）。
- Drift:
  - change 文档原写法使用两段式 `skill:execute` / `skill:cancel`，与当前 IPC 命名治理（3 段式）不一致。
- Action:
  - 进入 Red 前先更新当前 change 的 `proposal.md` / `tasks.md` / `specs/skill-system-delta.md` 以及 `EXECUTION_ORDER.md` 依赖描述，再推进实现。
- Conclusion: `DRIFT_FIXED`（已落盘修正动作）

### 2026-02-10 17:11 +0800 Red 证据（类型门禁失败）

- Command:
  - `pnpm typecheck`
- Exit code: `1`
- Key output:
  - `apps/desktop/tests/unit/skill-executor.test.ts` 共 4 个类型错误：
    - 3 处 `executor.execute(...)` 缺少必填字段 `ts`
    - 1 处 `SkillRunResult.error.code` 类型过宽（`string` 非 `IpcErrorCode`）
- Decision:
  - 仅修复 `apps/desktop/tests/unit/skill-executor.test.ts`，不改生产实现逻辑。

### 2026-02-10 17:13 +0800 Green（最小修复 + 场景测试）

- Command:
  - `pnpm typecheck`
  - `pnpm exec tsx apps/desktop/tests/unit/skill-builtin-catalog.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/skill-executor.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/ai-stream-lifecycle.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/ai-stream-race-cancel-priority.test.ts`
- Exit code: `0`
- Key output:
  - typecheck 通过，`skill-executor.test.ts` 错误清零。
  - 2 个 unit + 2 个 integration 场景测试全部通过（内置技能清单、执行器输入校验/上下文注入、流式生命周期、取消优先级）。

### 2026-02-10 17:19 +0800 Refactor 与契约对齐

- Command:
  - `pnpm contract:generate`
  - `pnpm contract:check`
- Exit code: `0`（最终）
- Key output:
  - `ipc-generated.ts` 已包含新增错误码 `SKILL_INPUT_EMPTY`，并与 `ipc-contract.ts` 保持一致。
  - `contract:check` 通过（生成结果稳定，无额外漂移）。

### 2026-02-10 17:24 +0800 门禁回归（除 preflight）

- Command:
  - `pnpm lint`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
- Exit code: `0`
- Key output:
  - `eslint` 全绿。
  - `[CROSS_MODULE_GATE] PASS`。
  - `test:unit` 全套通过，新增 `skill-builtin-catalog.test.ts` 与 `skill-executor.test.ts` 纳入门禁链路。

### 2026-02-10 17:28 +0800 归档收口（change + rulebook）

- Command:
  - `git mv openspec/changes/skill-system-p0-builtin-skills-executor openspec/changes/archive/skill-system-p0-builtin-skills-executor`
  - `rulebook task archive issue-392-skill-system-p0-builtin-skills-executor`
- Exit code: `0`
- Key output:
  - OpenSpec change 已归档至 `openspec/changes/archive/skill-system-p0-builtin-skills-executor`
  - Rulebook task 已归档至 `rulebook/tasks/archive/2026-02-10-issue-392-skill-system-p0-builtin-skills-executor`
  - `openspec/changes/EXECUTION_ORDER.md` 已同步活跃数（15 → 14）与依赖关系（skill-system p0 转归档依赖）

### 2026-02-10 17:31 +0800 提交前最终校验（格式 + 全量门禁）

- Command:
  - `pnpm exec prettier --check <changed-files>`
  - `pnpm typecheck && pnpm lint && pnpm contract:check && pnpm cross-module:check && pnpm test:unit`
- Exit code: `0`
- Key output:
  - `All matched files use Prettier code style!`
  - `typecheck/lint/contract/cross-module/test:unit` 全部通过。
