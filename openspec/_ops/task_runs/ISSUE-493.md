# ISSUE-493

- Issue: #493
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/493
- Branch: task/493-p2-entity-matcher
- PR: https://github.com/Leeky1017/CreoNow/pull/494
- Scope: 按 OpenSpec + Rulebook + GitHub 治理完整交付 `openspec/changes/p2-entity-matcher`，实现并验证实体文本匹配纯函数 `matchEntities`，最终合并回控制面 `main`
- Out of Scope: C9 `p2-kg-aliases` 的实体持久化改造、C11/C12 fetcher 实现、`kgRecognitionRuntime.ts` 异步 LLM 识别流程修改

## Plan

- [x] 准入：创建并绑定 OPEN issue #493
- [x] 环境隔离：创建 `task/493-p2-entity-matcher` worktree
- [x] Rulebook-first：创建并校验 `issue-493-p2-entity-matcher`
- [x] Specification + Dependency Sync Check 核对并更新 change 任务勾选
- [x] Red：先写 S1-S6 失败测试并记录证据
- [x] Green：最小实现 `entityMatcher.ts` 使测试通过
- [x] Refactor：确认纯函数与性能约束，保持绿灯
- [x] 门禁：目标测试 + typecheck/lint/contract/cross-module/unit + preflight
- [ ] 提交/PR/auto-merge + change 归档 + Rulebook 归档 + main 收口

## Runs

### 2026-02-13 09:33 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `gh issue create --title "Knowledge Graph P2: deliver p2-entity-matcher" --body-file /tmp/issue-p2-entity-matcher.md`
  - `scripts/agent_worktree_setup.sh 493 p2-entity-matcher`
  - `rulebook task create issue-493-p2-entity-matcher`
  - `rulebook task validate issue-493-p2-entity-matcher`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/493`
  - worktree 创建成功：`.worktrees/issue-493-p2-entity-matcher`
  - Branch：`task/493-p2-entity-matcher`
  - Rulebook task 校验通过：`issue-493-p2-entity-matcher`

### 2026-02-13 09:35 +0800 Specification + Dependency Sync Check

- Command:
  - `sed -n '1,320p' openspec/changes/archive/p2-kg-context-level/specs/knowledge-graph/spec.md`
  - `sed -n '1,360p' openspec/changes/p2-kg-aliases/specs/knowledge-graph/spec.md`
  - `sed -n '1,260p' apps/desktop/main/src/services/kg/kgRecognitionRuntime.ts`
  - `apply_patch openspec/changes/p2-entity-matcher/tasks.md`
- Exit code: `0`
- Key output:
  - C8 `AiContextLevel` 定义确认：`"always" | "when_detected" | "manual_only" | "never"`
  - C9 `aliases` 字段定义确认：`aliases: string[]`
  - `kgRecognitionRuntime.ts` 确认为异步 LLM 识别模块，与 `matchEntities` 同步纯函数职责互补
  - Dependency Sync Check 结论：`NO_DRIFT`

### 2026-02-13 09:38 +0800 Red（失败测试证据）

- Command:
  - `pnpm -C apps/desktop test:run main/src/services/kg/__tests__/entityMatcher.test.ts`
  - `pnpm install --frozen-lockfile`
  - `pnpm exec tsx apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts`
- Exit code:
  - 首轮：`1`（`apps/desktop` vitest 配置仅收集 `renderer/src/**/*.test.{ts,tsx}`）
  - 二轮：`1`（`ERR_MODULE_NOT_FOUND`）
- Key output:
  - `No test files found ... include: renderer/src/**/*.test.{ts,tsx}`
  - `Error [ERR_MODULE_NOT_FOUND]: Cannot find module .../services/kg/entityMatcher`

### 2026-02-13 09:39 +0800 Green + Refactor（最小实现转绿）

- Command:
  - `apply_patch apps/desktop/main/src/services/kg/entityMatcher.ts`
  - `apply_patch apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts`
  - `perl -0pi -e '<add entityMatcher test into test:unit chain>' package.json`
  - `pnpm exec tsx apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts`
- Exit code: `0`
- Key output:
  - 新增 `matchEntities` 纯函数，完成 `when_detected` 过滤、`name/aliases` 匹配、`entityId` 去重与 `position` 返回
  - S1-S6 目标测试通过
  - `test:unit` 脚本已纳入 `entityMatcher.test.ts`，防止回归遗漏

### 2026-02-13 09:42 +0800 门禁命令（本地）

- Command:
  - `pnpm exec tsx apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
- Exit code:
  - `target test=0`
  - `typecheck=0`
  - `lint=0`
  - `contract:check=0`
  - `cross-module:check=0`
  - `test:unit=0`
- Key output:
  - `[CROSS_MODULE_GATE] PASS`
  - `Storybook Inventory Check ... All stories are mapped`
  - 新增 `entityMatcher.test.ts` 已纳入 `test:unit` 且通过

### 2026-02-13 09:44 +0800 OpenSpec 收口（change 归档）

- Command:
  - `mv openspec/changes/p2-entity-matcher openspec/changes/archive/p2-entity-matcher`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - `p2-entity-matcher` 已从 active 迁移到 `openspec/changes/archive/`
  - `EXECUTION_ORDER.md` 已同步：活跃 change `5 -> 4`，并标注 C10 已归档

### 2026-02-13 09:46 +0800 PR 创建与正文修正

- Command:
  - `gh pr create --base main --head task/493-p2-entity-matcher --title "Deliver p2 entity matcher (#493)" --body ...`
  - `gh pr edit 494 --body-file /tmp/pr-494-body.md`
- Exit code: `0`
- Key output:
  - PR 创建成功：`https://github.com/Leeky1017/CreoNow/pull/494`
  - PR body 已修正并保留 `Closes #493`

### 2026-02-13 09:48 +0800 Preflight（失败修复后通过）

- Command:
  - `scripts/agent_pr_preflight.sh`
  - `pnpm exec prettier --write apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts rulebook/tasks/issue-493-p2-entity-matcher/.metadata.json rulebook/tasks/issue-493-p2-entity-matcher/proposal.md rulebook/tasks/issue-493-p2-entity-matcher/tasks.md`
  - `scripts/agent_pr_preflight.sh`
- Exit code:
  - 首轮：`1`（Prettier 检查失败）
  - 二轮：`0`
- Key output:
  - 首轮拦截：`Code style issues found in 4 files`
  - 修复后：`All matched files use Prettier code style!`
  - 全量 preflight 通过（typecheck/lint/contract/cross-module/test:unit 均通过）

### 2026-02-13 09:49 +0800 Rulebook 自归档

- Command:
  - `mv rulebook/tasks/issue-493-p2-entity-matcher rulebook/tasks/archive/2026-02-13-issue-493-p2-entity-matcher`
  - `apply_patch rulebook/tasks/archive/2026-02-13-issue-493-p2-entity-matcher/tasks.md`
  - `apply_patch rulebook/tasks/archive/2026-02-13-issue-493-p2-entity-matcher/.metadata.json`
- Exit code: `0`
- Key output:
  - 当前任务 Rulebook 已在同一 PR 内归档
  - `.metadata.json` 状态更新为 `completed`
