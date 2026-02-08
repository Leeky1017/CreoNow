# ISSUE-324

- Issue: #324
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/324
- Branch: task/324-memory-system-p3-isolation-degradation
- PR: (待回填)
- Scope: 完成交付 `openspec/changes/memory-system-p3-isolation-degradation`（作用域隔离 + 清除确认 + 降级策略）并合并回控制面 `main`
- Out of Scope: Context Engine 注入细节改造、AI Service 上游链路改造、新增独立 UI 模块

## Plan

- [x] 完成 Dependency Sync Check，并在进入 Red 前消除依赖漂移
- [x] 建立 MS4-R1/MS4-R2/MS4-X Scenario → 测试映射，先收集 Red 失败证据
- [x] 实现最小闭环（scope priority / promote / clear confirm / degrade）并转绿
- [x] 回归门禁命令并补齐 OpenSpec + Rulebook + RUN_LOG 证据
- [ ] 创建 PR、开启 auto-merge、等待 required checks 全绿
- [ ] 合并后同步控制面 `main`，归档 Rulebook task，清理 worktree

## Runs

### 2026-02-09 03:08 任务准入与环境隔离

- Command:
  - `gh issue create --title "Implement memory-system-p3-isolation-degradation" ...`
  - `scripts/agent_worktree_setup.sh 324 memory-system-p3-isolation-degradation`
- Exit code: `0`
- Key output:
  - 新任务 Issue 创建成功：`#324`
  - 新分支与 worktree 创建成功：`task/324-memory-system-p3-isolation-degradation`

### 2026-02-09 03:09 Rulebook 任务校验

- Command:
  - `rulebook task validate issue-324-memory-system-p3-isolation-degradation`
- Exit code: `0`
- Key output:
  - `✅ Task issue-324-memory-system-p3-isolation-degradation is valid`

### 2026-02-09 03:10 Dependency Sync Check（进入 Red 前）

- Command:
  - `sed -n '1,260p' openspec/changes/EXECUTION_ORDER.md`
  - `sed -n '1,320p' openspec/changes/archive/memory-system-p1-distillation-decay-conflict/specs/memory-system-delta.md`
  - `sed -n '1,320p' openspec/changes/archive/memory-system-p2-panel-provenance/specs/memory-system-delta.md`
  - `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - 上游（MS-2/MS-3）依赖能力齐备：语义记忆 CRUD、蒸馏进度、面板作用域交互。
  - 发现 IPC 命名治理约束漂移：`memory:promote` 不符合 `<domain>:<resource>:<action>` 规则。
- Conclusion:
  - `DRIFT_RESOLVED`：在进入 Red 前将提升通道改为 `memory:scope:promote`，并同步更新 change proposal/spec。

### 2026-02-09 03:11-03:14 Red 失败证据

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/memory/promote-project-rule.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/scope-priority-project-over-global.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/clear-confirmation-flow.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/clear-all-confirm-required.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/degrade-vector-offline.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/degrade-all-memory-unavailable.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/degrade-on-distill-io-failure.test.ts`
- Exit code: `1`（预期 Red）
- Key output:
  - `Missing handler memory:scope:promote`
  - `Missing handler memory:clear:project`
  - `Missing handler memory:clear:all`
  - `expected conflicting global rule to be ignored`
  - `expected vector/all-memory/distill degrade event`

### 2026-02-09 03:15-03:24 Green 实现与场景转绿

- Command:
  - `edit apps/desktop/main/src/services/memory/episodicMemoryService.ts`
  - `edit apps/desktop/main/src/ipc/memory.ts`
  - `edit apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `pnpm contract:generate`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/scope-priority-project-over-global.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/promote-project-rule.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/clear-confirmation-flow.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/degrade-vector-offline.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/degrade-all-memory-unavailable.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/clear-all-confirm-required.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/degrade-on-distill-io-failure.test.ts`
- Exit code: `0`
- Key output:
  - 7 个 MS-4 映射场景全部通过。
  - 新增能力：`memory:scope:promote`、`memory:clear:project`、`memory:clear:all`。
  - 新增错误码：`MEMORY_CLEAR_CONFIRM_REQUIRED`。

### 2026-02-09 03:25-03:29 门禁命令回归

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test:unit`
  - `pnpm test:integration`
- Exit code: `0`
- Key output:
  - `typecheck` 通过。
  - `lint` 无 error（存在仓库既有 warning）。
  - `test:unit`、`test:integration` 全部通过（含新增 MS-4 场景）。

### 2026-02-09 03:30 文档收口

- Command:
  - `edit rulebook/tasks/issue-324-memory-system-p3-isolation-degradation/*`
  - `edit openspec/changes/memory-system-p3-isolation-degradation/proposal.md`
  - `edit openspec/changes/memory-system-p3-isolation-degradation/tasks.md`
- Exit code: `0`
- Key output:
  - Rulebook proposal/tasks/spec 三件套补齐并 validate 通过。
  - OpenSpec change 任务已全量勾选，待执行归档与 PR 合并收口。

### 2026-02-09 03:33 格式与回归复核

- Command:
  - `pnpm exec prettier --check <changed-files>`
  - `pnpm exec prettier --write apps/desktop/main/src/services/memory/episodicMemoryService.ts apps/desktop/tests/integration/memory/degrade-vector-offline.test.ts apps/desktop/tests/integration/memory/promote-project-rule.test.ts rulebook/tasks/issue-324-memory-system-p3-isolation-degradation/.metadata.json`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test:unit`
  - `pnpm test:integration`
- Exit code: `0`
- Key output:
  - Prettier 全部通过（无格式漂移）。
  - typecheck/lint/unit/integration 复跑通过。

### 2026-02-09 03:36 OpenSpec 归档收口

- Command:
  - `git mv openspec/changes/memory-system-p3-isolation-degradation openspec/changes/archive/`
  - `edit openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - `memory-system-p3-isolation-degradation` 已归档到 `openspec/changes/archive/`。
  - `EXECUTION_ORDER.md` 已更新为当前无活跃 change。
