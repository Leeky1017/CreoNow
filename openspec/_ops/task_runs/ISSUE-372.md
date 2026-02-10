# ISSUE-372

- Issue: #372
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/372
- Branch: task/372-context-engine-p3-constraints-rules-injection
- PR: https://github.com/Leeky1017/CreoNow/pull/377
- Scope: 交付 `openspec/changes/context-engine-p3-constraints-rules-injection`，落地 Constraints CRUD、Rules 注入优先级与超预算裁剪日志，并完成主干收口
- Out of Scope: Judge 违规检测算法、Stable Prefix Hash 策略扩展、CE-4 边界硬化

## Plan

- [x] 准入：创建 OPEN issue + task worktree + Rulebook task validate
- [x] Dependency Sync Check：核对 CE-2 / Context / IPC 规范并落盘结论
- [x] Red：先写 CE4-R1-S1~S3 失败测试并保留证据
- [x] Green：实现 `constraints:policy:*` + Rules 注入/裁剪最小闭环
- [x] Refactor：抽离排序与裁剪函数，统一错误码/日志字段
- [ ] 门禁：typecheck/lint/contract/cross-module/unit/preflight
- [ ] PR + auto-merge + main 收口 + worktree 清理

## Runs

### 2026-02-10 11:54 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `gh issue create --title "Context Engine P3: Constraints rules injection" --body "..."`
  - `scripts/agent_worktree_setup.sh 372 context-engine-p3-constraints-rules-injection`
  - `rulebook task create issue-372-context-engine-p3-constraints-rules-injection`
  - `rulebook task validate issue-372-context-engine-p3-constraints-rules-injection`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/372`
  - worktree 创建成功：`.worktrees/issue-372-context-engine-p3-constraints-rules-injection`
  - Rulebook task 校验通过

### 2026-02-10 11:57 +0800 规格对齐（IPC 命名治理漂移修正）

- Command:
  - `apply_patch openspec/changes/context-engine-p3-constraints-rules-injection/proposal.md`
  - `apply_patch openspec/changes/context-engine-p3-constraints-rules-injection/specs/context-engine-delta.md`
  - `apply_patch openspec/changes/context-engine-p3-constraints-rules-injection/tasks.md`
  - `apply_patch rulebook/tasks/issue-372-context-engine-p3-constraints-rules-injection/proposal.md`
  - `apply_patch rulebook/tasks/issue-372-context-engine-p3-constraints-rules-injection/tasks.md`
- Exit code: `0`
- Key output:
  - Constraints 通道命名对齐为三段式：`constraints:policy:list/create/update/delete`
  - 补齐 Rulebook 任务目标、测试与文档收口项

### 2026-02-10 12:03 +0800 Dependency Sync Check（CE P3）

- Input:
  - `openspec/changes/archive/context-engine-p1-token-budget-truncation/specs/context-engine-delta.md`
  - `openspec/specs/context-engine/spec.md`
  - `openspec/specs/ipc/spec.md`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- Checkpoints:
  - 数据结构：沿用 CE-2 的层装配结果结构，新增约束字段不改变 `ContextAssembleResult` 外部形状。
  - IPC 契约：按命名治理对齐到 `constraints:policy:list/create/update/delete`，保留 `constraints:policy:get/set` 兼容通道。
  - 错误码：新增 `CONSTRAINT_VALIDATION_ERROR`、`CONSTRAINT_NOT_FOUND`、`CONSTRAINT_CONFLICT`，与现有 IPC 错误码无冲突。
  - 阈值：Rules overbudget 仍保持 `CONTEXT_RULES_OVERBUDGET` 告警语义，新增约束裁剪日志字段不影响 CE-2 比例阈值。
- Conclusion: `NO_DRIFT`

### 2026-02-10 12:05 +0800 环境依赖安装（worktree）

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `tsx 4.21.0` 安装完成，满足单测执行前置

### 2026-02-10 12:06 +0800 Red（CE4-R1-S1~S3 失败证据）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/context/constraints-crud-contract.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/constraints-priority-injection.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/constraints-overbudget-trim.test.ts`
- Exit code: `1`
- Key output:
  - `AssertionError: Missing handler constraints:policy:list`
  - `AssertionError ... /\[创作约束 - 不可违反\]/`（Rules 注入块缺失）
  - `AssertionError: false !== true`（Rules overbudget 裁剪未触发）

### 2026-02-10 12:12 +0800 Green（constraints CRUD + 注入排序 + 裁剪日志）

- Command:
  - `apply_patch apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `cat > apps/desktop/main/src/ipc/constraints.ts`
  - `apply_patch apps/desktop/main/src/services/context/layerAssemblyService.ts`
  - `apply_patch apps/desktop/main/src/ipc/context.ts`
  - `pnpm contract:generate`
  - `pnpm exec tsx apps/desktop/tests/unit/context/constraints-crud-contract.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/constraints-priority-injection.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/constraints-overbudget-trim.test.ts`
- Exit code: `0`
- Key output:
  - 新增契约：`constraints:policy:list/create/update/delete`
  - 新增错误码：`CONSTRAINT_VALIDATION_ERROR` / `CONSTRAINT_NOT_FOUND` / `CONSTRAINT_CONFLICT`
  - Rules 注入实现：`user > kg` + `updatedAt desc` + `id asc`
  - 约束裁剪实现：先裁剪低优先级 `kg`，再裁剪可降级 `user`，并通过 `onConstraintTrim` 输出结构化日志
  - CE4 对应 3 个场景测试全部转绿

### 2026-02-10 12:16 +0800 回归验证（Context + constraints）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/context/layer-assembly-contract.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/layer-degrade-warning.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-assemble-contract.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/context-inspect-contract.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/token-budget-within-limit.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/token-budget-truncation-order.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/token-budget-update-conflict.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/stable-prefix-hash-hit.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/context/stable-prefix-hash-invalidation.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/constraints-roundtrip.test.ts`
- Exit code: `0`
- Key output:
  - 受影响的 Context 与 constraints 相关单测/集成测试均通过

### 2026-02-10 12:21 +0800 门禁验证（type/lint/contract/cross-module/unit）

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
  - `contract:check=1 -> 0`（纳入 codegen 变更后通过）
  - `cross-module:check=0`
  - `test:unit=0`
- Key output:
  - `test:unit` 全链路通过，新增 CE-4 测试已纳入执行脚本

### 2026-02-10 12:14 +0800 文档收口（change 完成并归档）

- Command:
  - `perl -0pi -e 's/- [ ]/- [x]/g' openspec/changes/context-engine-p3-constraints-rules-injection/tasks.md`
  - `mv openspec/changes/context-engine-p3-constraints-rules-injection openspec/changes/archive/`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - `context-engine-p3-constraints-rules-injection` 已迁移至 `openspec/changes/archive/`
  - `EXECUTION_ORDER.md` 已同步活跃 change 数量 `7 -> 6`
  - Context Engine 泳道已更新为仅 `p4`

### 2026-02-10 12:15 +0800 preflight 阻断确认（PR 占位符）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `PRE-FLIGHT FAILED: [RUN_LOG] PR field still placeholder ... ISSUE-372.md: (待回填)`
