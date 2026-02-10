# ISSUE-366

- Issue: #366
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/366
- Branch: task/366-context-engine-p2-stable-prefix-hash
- PR: https://github.com/Leeky1017/CreoNow/pull/369
- Scope: 交付 `openspec/changes/context-engine-p2-stable-prefix-hash`，落地 canonicalize + SHA-256 + stablePrefixUnchanged 维度语义，并完成主干收口
- Out of Scope: Token 预算策略变更、Constraints CRUD 变更、Judge 具体算法

## Plan

- [x] 准入：创建 OPEN issue + task worktree + Rulebook task validate
- [x] Dependency Sync Check：核对 CE-2 / Context / AI Service / IPC 规范，结论 `NO_DRIFT`
- [x] Red：先写 CE3-R1-S1 / CE3-R1-S2 失败测试并保留证据
- [x] Green：实现 stable prefix canonicalize + cache key 语义
- [x] Refactor：保持行为不变并收敛 helper 复用
- [ ] 门禁：typecheck/lint/contract/cross-module/unit/preflight
- [ ] PR + auto-merge + main 收口 + worktree 清理

## Runs

### 2026-02-10 11:01 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `gh issue create --title "Deliver context-engine-p2-stable-prefix-hash change and merge to main" --body "..."`
  - `scripts/agent_worktree_setup.sh 366 context-engine-p2-stable-prefix-hash`
  - `rulebook task create issue-366-context-engine-p2-stable-prefix-hash`
  - `rulebook task validate issue-366-context-engine-p2-stable-prefix-hash`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/366`
  - worktree 创建成功：`.worktrees/issue-366-context-engine-p2-stable-prefix-hash`
  - Rulebook task 校验通过（初始提示：无 specs 文件）

### 2026-02-10 11:05 +0800 Dependency Sync Check（CE P2）

- Input:
  - `openspec/changes/archive/context-engine-p1-token-budget-truncation/specs/context-engine-delta.md`
  - `openspec/specs/context-engine/spec.md`
  - `openspec/specs/ai-service/spec.md`
  - `openspec/specs/ipc/spec.md`
- Checkpoints:
  - 数据结构：`ContextAssembleResult` 仍保持 `stablePrefixHash/stablePrefixUnchanged` 输出契约。
  - IPC 契约：`context:prompt:assemble` 命名与 request-response 模式未漂移；CE3 新增 provider/model/tokenizerVersion 仅作为可选入参扩展。
  - 错误码：CE3 不新增错误码，不与 CE2 预算错误码冲突。
  - 阈值：`constraints` 排序与非确定字段剔除不涉及 CE2 预算阈值，兼容上游。
- Conclusion: `NO_DRIFT`

### 2026-02-10 11:06 +0800 环境依赖安装（worktree）

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `tsx 4.21.0` 可用，满足单测执行前置条件

### 2026-02-10 11:07 +0800 Red（CE3-R1-S1 / CE3-R1-S2 失败证据）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/context/stable-prefix-hash-hit.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/stable-prefix-hash-invalidation.test.ts`
- Exit code: `1`
- Key output:
  - `AssertionError [ERR_ASSERTION] ... stablePrefixHash`（同语义输入 hash 不一致）
  - 失败点表明现有实现未完成 canonicalize/去噪

### 2026-02-10 11:09 +0800 Green（canonicalize + key 维度 + contract）

- Command:
  - `apply_patch apps/desktop/main/src/services/context/layerAssemblyService.ts`
  - `apply_patch apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apply_patch apps/desktop/tests/unit/context/stable-prefix-hash-hit.test.ts`
  - `apply_patch apps/desktop/tests/unit/context/stable-prefix-hash-invalidation.test.ts`
  - `pnpm contract:generate`
  - `pnpm exec tsx apps/desktop/tests/unit/context/stable-prefix-hash-hit.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/stable-prefix-hash-invalidation.test.ts`
- Exit code: `0`
- Key output:
  - stable-prefix 归一化：稳定键排序 + `constraints(priority desc,id asc)` + 剔除 `timestamp/requestId/nonce`
  - `stablePrefixUnchanged` key 更新为 `projectId+skillId+provider+model+tokenizerVersion`
  - CE3 新增单测转绿

### 2026-02-10 11:10 +0800 门禁验证（type/lint/contract/cross-module/unit）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `git add packages/shared/types/ipc-generated.ts && pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
- Exit code:
  - `typecheck=0`
  - `lint=0`（仅历史 warning）
  - `contract:check=1 -> 0`（修复 codegen 差异后通过）
  - `cross-module:check=0`
  - `test:unit=0`
- Key output:
  - `contract:check` 首次阻断原因为 `packages/shared/types/ipc-generated.ts` 差异（新增 assemble/inspect 可选字段）。
  - 纳入 codegen 变更后复跑通过。
  - `test:unit` 全量链路通过，新增 CE-3 测试已纳入执行。

### 2026-02-10 11:12 +0800 文档收口（change 归档 + 执行顺序同步）

- Command:
  - `perl -0pi -e 's/- [ ]/- [x]/g' openspec/changes/context-engine-p2-stable-prefix-hash/tasks.md`
  - `mv openspec/changes/context-engine-p2-stable-prefix-hash openspec/changes/archive/`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - `context-engine-p2-stable-prefix-hash` 已迁移至 `openspec/changes/archive/`
  - `EXECUTION_ORDER.md` 已同步活跃 change 数量 `11 -> 10`
  - Context Engine 泳道已更新为 `p3 -> p4`

### 2026-02-10 11:13 +0800 preflight 阻断确认（PR 占位符）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `PRE-FLIGHT FAILED: [RUN_LOG] PR field still placeholder ... ISSUE-366.md: (待回填)`
