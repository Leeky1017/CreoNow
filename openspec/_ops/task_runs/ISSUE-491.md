# ISSUE-491

- Issue: #491
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/491
- Branch: task/491-p2-kg-context-level
- PR: (待回填)
- Scope: 按 OpenSpec + Rulebook + GitHub 治理完整交付 `openspec/changes/p2-kg-context-level`，实现并验证 Knowledge Graph `aiContextLevel` 字段与查询过滤能力，最终合并回控制面 `main`
- Out of Scope: C9/C10/C11/C12（`aliases`、实体匹配、Rules/Retrieved fetcher）与 KG 前端 UI 交互

## Plan

- [x] 准入：创建并绑定 OPEN issue #491
- [x] 环境隔离：创建 `task/491-p2-kg-context-level` worktree
- [x] Rulebook-first：创建并校验 `issue-491-p2-kg-context-level`
- [ ] Specification + TDD Mapping 核对并补全变更任务勾选
- [ ] Red：先写 S1-S4 失败测试并记录证据
- [ ] Green：最小实现（service + contract + migration + harness）使测试通过
- [ ] Refactor：导出常量/类型并统一校验路径，保持绿灯
- [ ] 门禁：目标测试 + typecheck/lint/contract/cross-module/unit + preflight
- [ ] 提交/PR/auto-merge + change 归档 + Rulebook 归档 + main 收口

## Runs

### 2026-02-13 03:13 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `gh issue create --title "Knowledge Graph P2: deliver p2-kg-context-level" --body-file /tmp/issue-p2-kg-context-level.md`
  - `scripts/agent_worktree_setup.sh 491 p2-kg-context-level`
  - `rulebook task create issue-491-p2-kg-context-level`
  - `rulebook task validate issue-491-p2-kg-context-level`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/491`
  - worktree 创建成功：`.worktrees/issue-491-p2-kg-context-level`
  - Branch：`task/491-p2-kg-context-level`
  - Rulebook task 校验通过：`issue-491-p2-kg-context-level`

### 2026-02-13 03:18 +0800 Rulebook 任务完善

- Command:
  - `apply_patch rulebook/tasks/issue-491-p2-kg-context-level/proposal.md`
  - `apply_patch rulebook/tasks/issue-491-p2-kg-context-level/tasks.md`
  - `rulebook task validate issue-491-p2-kg-context-level`
- Exit code: `0`
- Key output:
  - Rulebook proposal/tasks 已从模板替换为 C8 真实交付内容
  - validate 通过：`✅ Task issue-491-p2-kg-context-level is valid`

### 2026-02-13 03:20 +0800 Red（失败测试证据）

- Command:
  - `pnpm vitest run apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts`
  - `pnpm install --frozen-lockfile`
  - `pnpm exec tsx apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts`
- Exit code:
  - 首轮：`1`（`vitest` 命令在根 workspace 不可用）
  - 二轮：`1`（S1 断言失败）
- Key output:
  - `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found`
  - `AssertionError ... actual: undefined expected: 'when_detected'`（`entity.aiContextLevel` 未实现）

### 2026-02-13 03:27 +0800 Green（最小实现 + 契约/迁移闭环）

- Command:
  - `apply_patch apps/desktop/main/src/services/kg/kgService.ts`
  - `apply_patch apps/desktop/main/src/ipc/knowledgeGraph.ts`
  - `apply_patch apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apply_patch apps/desktop/main/src/db/init.ts`
  - `apply_patch apps/desktop/tests/helpers/kg/harness.ts`
  - `apply_patch package.json`
  - `apply_patch apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts`
  - `apply_patch openspec/changes/p2-kg-context-level/tasks.md`
  - `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - `KnowledgeEntity` / IPC contract 新增 `aiContextLevel`
  - `entityCreate` 默认 `when_detected`；`entityUpdate` 支持 patch；`entityList` 支持 `filter.aiContextLevel`
  - 所有实体 SELECT/row 映射新增 `ai_context_level as aiContextLevel`
  - 新增 migration：`0018_kg_ai_context_level.sql`
  - 生成类型已同步：`packages/shared/types/ipc-generated.ts`

### 2026-02-13 03:32 +0800 Green 回归验证

- Command:
  - `pnpm exec tsx apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/kg/entity-create-role.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/kg/entity-update-attributes.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/kg/entity-update-conflict.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/kg/entity-duplicate-guard.test.ts`
- Exit code: `0`
- Key output:
  - C8 目标测试转绿
  - 受影响 KG 基线单测/集成测试通过（未观察回归）

### 2026-02-13 03:35 +0800 门禁命令（本地）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `git add packages/shared/types/ipc-generated.ts && pnpm contract:check`
- Exit code:
  - `typecheck=0`
  - `lint=0`
  - `contract:check=1 -> 0`（先提示 codegen 文件未纳入，再纳入后通过）
  - `cross-module:check=0`
  - `test:unit=0`
- Key output:
  - `CROSS_MODULE_GATE PASS`
  - `Storybook Inventory Check ... All stories are mapped`
  - 新增 `kgService.contextLevel.test.ts` 已纳入 `test:unit` 链路

### 2026-02-13 03:37 +0800 OpenSpec 收口（change 归档）

- Command:
  - `mv openspec/changes/p2-kg-context-level openspec/changes/archive/p2-kg-context-level`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - `p2-kg-context-level` 已从 active 迁移到 `openspec/changes/archive/`
  - `EXECUTION_ORDER.md` 已同步：活跃 change `6 -> 5`，并标注 C8 已归档

### 2026-02-13 03:30 +0800 类型漂移修复（门禁反馈）

- Trigger:
  - `pnpm typecheck` 首轮报错：
    - `kgService.contextLevel.test.ts` 中 `"invalid_value"` 字面量与 `AiContextLevel` 类型冲突
    - `KnowledgeGraphPanel.render.test.tsx` 的 `KgEntity` fixture 缺少 `aiContextLevel`
- Command:
  - `apply_patch apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts`
  - `apply_patch apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.render.test.tsx`
  - `pnpm typecheck`
  - `cd apps/desktop && pnpm test:run renderer/src/features/kg/KnowledgeGraphPanel.render.test.tsx`
- Exit code: `0`
- Key output:
  - `KnowledgeGraphPanel.render.test.tsx`：`1 test passed`
  - typecheck 复跑通过

### 2026-02-13 03:33 +0800 Rulebook 自归档

- Command:
  - `mv rulebook/tasks/issue-491-p2-kg-context-level rulebook/tasks/archive/2026-02-13-issue-491-p2-kg-context-level`
  - `apply_patch rulebook/tasks/archive/2026-02-13-issue-491-p2-kg-context-level/tasks.md`
  - `cat > rulebook/tasks/archive/2026-02-13-issue-491-p2-kg-context-level/.metadata.json`
- Exit code: `0`
- Key output:
  - 当前任务 Rulebook 已在同一 PR 内归档
  - `.metadata.json` 状态更新为 `completed`
