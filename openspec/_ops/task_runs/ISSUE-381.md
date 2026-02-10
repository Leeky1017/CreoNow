# ISSUE-381

- Issue: #381
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/381
- Branch: task/381-context-engine-p4-hardening-boundary
- PR: https://github.com/Leeky1017/CreoNow/pull/383
- Scope: 交付 `openspec/changes/context-engine-p4-hardening-boundary` 的 CE5 边界硬化任务，完成测试、实现、门禁、归档与主干收口
- Out of Scope: Context 层优先级与默认预算比例调整、Judge 算法实现、AI Provider 侧行为重定义

## Plan

- [x] 准入：OPEN issue + task worktree + Rulebook task validate
- [x] Dependency Sync Check：核对 CE-3/CE-4 与主规范，结论落盘
- [x] Red：先写 CE5 场景失败测试并记录证据
- [x] Green：实现最小边界保护与错误码链路
- [x] Refactor：统一边界守卫与审计日志字段
- [ ] 门禁：typecheck/lint/contract/cross-module/unit/preflight
- [ ] PR + auto-merge + main 收口 + Rulebook/Change 归档 + worktree 清理

## Runs

### 2026-02-10 12:58 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `gh issue create --title "Context Engine P4: hardening boundary" --body "..."`
  - `scripts/agent_worktree_setup.sh 381 context-engine-p4-hardening-boundary`
  - `rulebook task create issue-381-context-engine-p4-hardening-boundary`
  - `rulebook task validate issue-381-context-engine-p4-hardening-boundary`
  - `gh issue edit 381 --body-file /tmp/issue-381-body.md`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/381`
  - worktree 创建成功：`.worktrees/issue-381-context-engine-p4-hardening-boundary`
  - Rulebook task 校验通过：`issue-381-context-engine-p4-hardening-boundary`
  - Issue body 已修正为包含 checks 与 controlplane 收口要求

### 2026-02-10 13:08 +0800 Dependency Sync Check（CE5）

- Input:
  - `openspec/changes/archive/context-engine-p2-stable-prefix-hash/specs/context-engine-delta.md`
  - `openspec/changes/archive/context-engine-p3-constraints-rules-injection/specs/context-engine-delta.md`
  - `openspec/specs/context-engine/spec.md`
  - `openspec/specs/ipc/spec.md`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- Checkpoints:
  - 数据结构：沿用 CE2/CE3 的 `ContextAssembleResult` / `ContextInspectResult`，新增字段仅限 inspect request `callerRole` 与 layer chunk `projectId`（内部校验用）。
  - IPC 契约：继续使用 `context:prompt:assemble|inspect` 与 `context:budget:update`，新增 CE5 错误码不改变 envelope 结构。
  - 错误码：保留 `CONTEXT_SCOPE_VIOLATION`、`CONTEXT_BUDGET_CONFLICT`；新增 `CONTEXT_INSPECT_FORBIDDEN`、`CONTEXT_INPUT_TOO_LARGE`、`CONTEXT_BACKPRESSURE`。
  - 阈值：固化 `64k input`、`retrieved chunk<=200`、`in-flight<=4` 与 SLO 常量，不调整 Owner 固定层优先级/默认比例。
- Conclusion: `NO_DRIFT`

### 2026-02-10 13:10 +0800 环境依赖安装（worktree）

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - 依赖安装完成，`tsx 4.21.0` 可用

### 2026-02-10 13:12 +0800 Red（CE5 场景失败证据）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/context/context-slo-thresholds.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-inspect-permission.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-budget-update-conflict.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-scope-violation.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-input-too-large.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/context/context-backpressure-redaction.test.ts`
- Exit code:
  - 首轮：`1`（worktree 未安装依赖，`Command "tsx" not found`）
  - 二轮：`1`（5 失败 + 1 通过）
- Key output:
  - `context-slo-thresholds`: `does not provide an export named 'CONTEXT_CAPACITY_LIMITS'`
  - `context-inspect-permission`: `AssertionError ... true !== false`（未触发 forbidden）
  - `context-scope-violation`: `AssertionError ... true !== false`（未阻断跨项目注入）
  - `context-input-too-large`: `AssertionError ... true !== false`（未触发 input hard cap）
  - `context-backpressure-redaction`: `AssertionError ... true !== false`（未触发 backpressure）
  - `context-budget-update-conflict`: `EXIT:0`（既有能力保持通过）

### 2026-02-10 13:20 +0800 Green（CE5 边界实现 + codegen）

- Command:
  - `apply_patch apps/desktop/main/src/services/context/layerAssemblyService.ts`
  - `apply_patch apps/desktop/main/src/ipc/context.ts`
  - `apply_patch apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - 新增常量：`CONTEXT_SLO_THRESHOLDS_MS`、`CONTEXT_CAPACITY_LIMITS`
  - 新增边界保护：retrieved chunk cap（`200`）+ warning `CONTEXT_RETRIEVED_CHUNK_LIMIT`
  - 新增跨项目阻断：`CONTEXT_SCOPE_VIOLATION`
  - 新增 inspect 门禁：`debugMode=true` 且 `callerRole in {owner,maintainer}`
  - 新增 input hard cap：`CONTEXT_INPUT_TOO_LARGE`
  - 新增同文档并发背压：`CONTEXT_BACKPRESSURE`
  - 新增日志审计字段：hash/计数/脱敏采样（无原文 prompt 落盘）

### 2026-02-10 13:23 +0800 CE5 测试转绿 + Context 回归

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/context/context-slo-thresholds.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-inspect-permission.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-budget-update-conflict.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-scope-violation.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-input-too-large.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/context/context-backpressure-redaction.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/*.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/context/*.test.ts`
- Exit code:
  - 首次 context 全量回归：`1`（`context-inspect-contract.test.ts` 需补 `callerRole`）
  - 修复后回归：`0`
- Key output:
  - CE5 六个映射测试全部 `EXIT:0`
  - 既有 context 单测与新增 integration/context 测试全部通过

### 2026-02-10 13:30 +0800 门禁执行（进行中）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`（首轮）
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `git add packages/shared/types/ipc-generated.ts && pnpm contract:check`（二轮）
- Exit code:
  - `typecheck=0`
  - `lint=0`（仅历史 warning）
  - `contract:check=1 -> 0`（纳入 codegen 变更后通过）
  - `cross-module:check=0`
  - `test:unit=0`
- Key output:
  - `cross-module`: `[CROSS_MODULE_GATE] PASS`
  - `test:unit`: context + 其他单测链路通过

### 2026-02-10 13:35 +0800 preflight 阻断确认（PR 占位符）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `PRE-FLIGHT FAILED: [RUN_LOG] PR field still placeholder ... ISSUE-381.md: (待回填)`

### 2026-02-10 13:36 +0800 OpenSpec 收口（change 归档 + 顺序同步）

- Command:
  - `perl -0pi -e 's/- [ ]/- [x]/g' openspec/changes/context-engine-p4-hardening-boundary/tasks.md`
  - `mv openspec/changes/context-engine-p4-hardening-boundary openspec/changes/archive/`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - `context-engine-p4-hardening-boundary` 已迁移至 `openspec/changes/archive/`
  - `EXECUTION_ORDER.md` 活跃 change 数量同步 `4 -> 3`
  - Context Engine 泳道更新为 `p0→p4` 已归档、无活跃项
