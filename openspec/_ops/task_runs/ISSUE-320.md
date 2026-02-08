# ISSUE-320

- Issue: #320
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/320
- Branch: task/320-memory-system-p2-panel-provenance
- PR: https://github.com/Leeky1017/CreoNow/pull/322
- Scope: 完成交付 `memory-system-p2-panel-provenance`（Memory Panel + GenerationTrace 溯源）并合并回控制面 `main`
- Out of Scope: `memory-system-p3-isolation-degradation`、`knowledge-graph-p2-auto-recognition-ai-utilization`

## Plan

- [x] 修复剩余红灯并完成 MS-3 场景测试转绿
- [x] 完成 IPC 契约与类型对齐，修复 typecheck 阻断
- [x] 补齐 OpenSpec/Rulebook 文档与 Dependency Sync Check 证据
- [x] 归档已完成 change，并同步 `EXECUTION_ORDER.md`
- [ ] 创建 PR、开启 auto-merge、等待 required checks 全绿
- [ ] 合并后同步控制面 `main`，归档 Rulebook task，清理 worktree

## Runs

### 2026-02-09 01:46 Dependency Sync Check（进入 Red 前基线核对）

- Command:
  - `sed -n '1,260p' openspec/changes/EXECUTION_ORDER.md`
  - `sed -n '1,260p' openspec/changes/archive/memory-system-p1-distillation-decay-conflict/specs/memory-system-delta.md`
  - `sed -n '1,260p' openspec/changes/memory-system-p2-panel-provenance/specs/memory-system-delta.md`
- Exit code: `0`
- Key output:
  - 上游依赖（MS-2）语义记忆 CRUD / 蒸馏 / 冲突能力已存在。
  - 本 change 假设与上游产出一致，无阈值/错误码/契约漂移。
- Conclusion:
  - `NO_DRIFT`，允许进入 Red。

### 2026-02-09 01:46 Red 失败证据（MS3-R1-S4）

- Command:
  - `pnpm -C apps/desktop test:run renderer/src/features/memory/__tests__/memory-panel-manual-add-empty-state.test.tsx`
- Exit code: `1`（预期 Red）
- Key output:
  - `Found multiple elements with the role "button" and name "手动添加规则"`
  - 失败原因：空状态 CTA 与底部动作区按钮同名导致测试定位冲突。

### 2026-02-09 01:47 Green 修复与场景验证

- Command:
  - `edit apps/desktop/renderer/src/features/memory/__tests__/memory-panel-manual-add-empty-state.test.tsx`
  - `pnpm -C apps/desktop test:run renderer/src/features/memory/__tests__/memory-panel-manual-add-empty-state.test.tsx`
  - `pnpm -C apps/desktop test:run renderer/src/features/memory/__tests__/memory-panel-confirm.test.tsx renderer/src/features/memory/__tests__/memory-panel-edit.test.tsx renderer/src/features/memory/__tests__/memory-panel-delete.test.tsx renderer/src/features/memory/__tests__/memory-panel-pause-learning.test.tsx`
- Exit code: `0`
- Key output:
  - 5 个面板场景测试全部通过：MS3-R1-S1~S5。

### 2026-02-09 01:49 Typecheck 阻断与修复

- Command:
  - `pnpm typecheck`
- Exit code: `1`
- Key output:
  - `MemoryPanel.stories.tsx` 类型推断为 `never`。
  - MemoryPanel 测试 invoke mock 签名不满足泛型约束。
  - trace 集成测试 `traceService` 缺少 `upsertTrace` / `listFeedbackForGeneration`。

- Fix:
  - `edit apps/desktop/renderer/src/features/memory/MemoryPanel.stories.tsx`
  - `edit apps/desktop/renderer/src/features/memory/MemoryPanel.test.tsx`
  - `edit apps/desktop/renderer/src/features/memory/__tests__/memory-panel-*.test.tsx`
  - `edit apps/desktop/tests/integration/memory/trace-*.test.ts`

- Re-run:
  - `pnpm typecheck`
- Exit code: `0`

### 2026-02-09 01:50 溯源场景验证（MS3-R2/MS3-X）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/memory/trace-get-display.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/trace-feedback.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/trace-mismatch-error.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/trace-cross-project-deny.test.ts`
- Exit code: `0`
- Key output:
  - 4 个溯源/异常集成测试全部通过：MS3-R2-S1、MS3-R2-S2、MS3-X-S1、MS3-X-S2。

### 2026-02-09 01:51-01:54 门禁命令验证

- Command:
  - `pnpm lint`
  - `pnpm test:unit`
  - `pnpm test:integration`
  - `pnpm -C apps/desktop test:run`
  - `pnpm -C apps/desktop storybook:build`
- Exit code: `0`
- Key output:
  - `test:unit`、`test:integration`、renderer 全量 vitest 均通过。
  - `storybook:build` 成功产出 `apps/desktop/storybook-static`。
  - `lint` 无 error（存在仓库既有 warning，非本变更引入）。

### 2026-02-09 01:55 OpenSpec/Rulebook 收口

- Command:
  - `edit openspec/changes/memory-system-p2-panel-provenance/proposal.md`
  - `edit openspec/changes/memory-system-p2-panel-provenance/tasks.md`
  - `git mv openspec/changes/memory-system-p2-panel-provenance openspec/changes/archive/`
  - `edit openspec/changes/EXECUTION_ORDER.md`
  - `edit rulebook/tasks/issue-320-memory-system-p2-panel-provenance/*`
- Exit code: `0`
- Key output:
  - change 已归档到 `openspec/changes/archive/memory-system-p2-panel-provenance`。
  - `EXECUTION_ORDER.md` 已同步到 2 个活跃 change。
  - Rulebook proposal/tasks/spec 已补齐。
