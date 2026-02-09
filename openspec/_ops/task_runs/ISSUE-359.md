# ISSUE-359

- Issue: #359
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/359
- Branch: task/359-context-engine-p1-token-budget-truncation
- PR: (待回填)
- Scope: 交付 `openspec/changes/context-engine-p1-token-budget-truncation`，落地固定预算比例/最小保障、固定裁剪顺序、预算 IPC 契约与失败码，并完成主干收口
- Out of Scope: Stable Prefix Hash 扩展、Constraints 注入策略、P4 硬化边界

## Plan

- [x] 准入：创建 OPEN issue + task worktree + Rulebook task validate
- [x] Dependency Sync Check：核对 CE-1 / Context / IPC / Search spec，结论 `NO_DRIFT`
- [ ] Red：先写 CE2-R1-S1~S3 失败测试并保留证据
- [ ] Green：实现预算裁剪与 `context:budget:get/update`
- [ ] Refactor：抽离预算校验并统一错误码映射
- [ ] 门禁：typecheck/lint/contract/cross-module/unit/preflight
- [ ] PR + auto-merge + main 收口 + worktree 清理

## Runs

### 2026-02-10 00:00 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `gh issue create --title "Deliver context-engine-p1-token-budget-truncation change and merge to main" --body-file ...`
  - `scripts/agent_worktree_setup.sh 359 context-engine-p1-token-budget-truncation`
  - `rulebook task create issue-359-context-engine-p1-token-budget-truncation`
  - `rulebook task validate issue-359-context-engine-p1-token-budget-truncation`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/359`
  - worktree 创建成功：`.worktrees/issue-359-context-engine-p1-token-budget-truncation`
  - Rulebook task 校验通过

### 2026-02-10 00:03 +0800 Dependency Sync Check（CE P1）

- Input:
  - `openspec/changes/archive/context-engine-p0-layer-assembly-api/specs/context-engine-delta.md`
  - `openspec/specs/context-engine/spec.md`
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/ipc/spec.md`
- Checkpoints:
  - 数据结构：沿用 CE-1 四层契约字段，新增预算 profile 不破坏已有 assemble/inspect 结构
  - IPC 契约：新增 `context:budget:get/update`，命名遵循 `<domain>:<resource>:<action>`
  - 错误码：新增预算错误码不覆盖既有 code，仍返回可判定 `{ ok: false, error }`
  - 阈值：与 CE2 delta 一致（`15/10/25/50` + `500/200/0/2000`）
- Conclusion: `NO_DRIFT`

### 2026-02-10 00:06 +0800 环境依赖安装（worktree）

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `Packages: +978`
  - `tsx 4.21.0` 安装完成，可执行新增单测

### 2026-02-10 00:07 +0800 Red（CE2-R1-S1~S3 失败证据）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/context/token-budget-within-limit.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/token-budget-truncation-order.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/token-budget-update-conflict.test.ts`
- Exit code: `1`
- Key output:
  - `TypeError: service.getBudgetProfile is not a function`
  - `AssertionError ... false !== true`（超预算裁剪顺序断言失败）
  - `AssertionError: Missing handler context:budget:get`

### 2026-02-10 00:11 +0800 Green（预算实现 + IPC + contract）

- Command:
  - `apply_patch apps/desktop/main/src/services/context/layerAssemblyService.ts`
  - `apply_patch apps/desktop/main/src/ipc/context.ts`
  - `apply_patch apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `pnpm contract:generate`
  - `pnpm exec tsx apps/desktop/tests/unit/context/token-budget-within-limit.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/token-budget-truncation-order.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/token-budget-update-conflict.test.ts`
- Exit code: `0`
- Key output:
  - 新增 budget profile 能力：固定比例/最小保障 + `get/update`
  - 新增 IPC：`context:budget:get`、`context:budget:update`
  - 新增错误码：`CONTEXT_BUDGET_INVALID_RATIO`、`CONTEXT_BUDGET_INVALID_MINIMUM`、`CONTEXT_BUDGET_CONFLICT`、`CONTEXT_TOKENIZER_MISMATCH`
  - CE2 对应 3 个场景测试全部通过

### 2026-02-10 00:15 +0800 门禁前验证（第一轮）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
- Exit code:
  - `typecheck=0`
  - `lint=0`（仅历史 warning）
  - `contract:check=1`
  - `cross-module:check=0`
  - `test:unit=0`
- Key output:
  - `contract:check` 阻断原因为 `packages/shared/types/ipc-generated.ts` 发生预期差异（新增 context budget IPC 与错误码）；后续纳入提交后复跑

### 2026-02-10 00:18 +0800 门禁修复（contract:check 复跑）

- Command:
  - `git add packages/shared/types/ipc-generated.ts`
  - `pnpm contract:check`
- Exit code: `0`
- Key output:
  - `pnpm contract:generate` 完成后 `git diff --exit-code packages/shared/types/ipc-generated.ts` 通过
  - 证实 contract 阻断为预期 codegen 差异，已收敛

### 2026-02-10 00:20 +0800 文档收口（change 归档 + 执行顺序同步）

- Command:
  - `perl -0pi -e 's/- [ ]/- [x]/g' openspec/changes/context-engine-p1-token-budget-truncation/tasks.md`
  - `mv openspec/changes/context-engine-p1-token-budget-truncation openspec/changes/archive/`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - `context-engine-p1-token-budget-truncation` 已迁移至 `openspec/changes/archive/`
  - `EXECUTION_ORDER.md` 已同步活跃 change 数量 `13 -> 12`
  - Context Engine 泳道已更新为 `(p2 || p3) -> p4`
