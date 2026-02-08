# ISSUE-308

- Issue: #308
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/308
- Branch: `task/308-knowledge-graph-p1-visualization-extended-views`
- PR: (待回填)
- Scope: 完整交付 `openspec/changes/knowledge-graph-p1-visualization-extended-views` 的全部 tasks（仅该 change）
- Out of Scope: 其它 change 与非本 change 的功能实现

## Goal

- 完成 KG2 渲染层任务：关系图、时间线、角色卡与 Storybook 覆盖。
- 严格执行 TDD：Scenario 映射、Red 失败证据、Green 通过证据。
- 在独立 worktree 完成开发、提交流程、PR 合并并收口到控制面 `main`。

## Status

- CURRENT: 进行中（已完成实现/测试/归档文档，待 preflight、PR 合并、main 收口与 Rulebook 归档）。

## Plan

- 已完成 Dependency Sync Check（数据结构、IPC 契约、错误码、阈值）并落盘，无漂移。
- 已完成 7 组 Scenario 映射测试并收集 Red / Green 证据。
- 已完成 change 归档与执行顺序文档同步，等待门禁与合并收口。
- 下一步：preflight、自动创建 PR、auto-merge、同步控制面 main、清理 worktree、归档 Rulebook task。

## Scenario → Test Mapping

- KG2-R1-S1 `关系图展示项目实体`
  - `apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.render.test.tsx`
  - `should render force-directed graph with typed node colors and relation labels`
- KG2-R1-S2 `关系图空状态`
  - `apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.empty-state.test.tsx`
  - `should render empty state and create-node CTA when graph has no entities`
- KG2-R1-S3 `节点拖拽与缩放`
  - `apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.interaction.test.tsx`
  - `should update node positions on drag and zoom around cursor anchor`
- KG2-R2-S1 `时间线按章节展示并支持拖拽排序`
  - `apps/desktop/renderer/src/features/kg/TimelineView.ordering.test.tsx`
  - `should render chapter-based axis and persist event reordering`
- KG2-R2-S2 `角色卡列表展示`
  - `apps/desktop/renderer/src/features/character/CharacterCardList.test.tsx`
  - `should render avatar placeholder name type attributes and relation summary`
- KG2-R2-S3 `角色卡空状态`
  - `apps/desktop/renderer/src/features/character/CharacterCardEmptyState.test.tsx`
  - `should show empty state and create-character CTA when no character entities`
- KG2-A-S1 `Storybook 覆盖完整`
  - `apps/desktop/renderer/src/features/kg/kg-views.stories.snapshot.test.ts`
  - `should cover graph(3 states) and character-card(3 states) story snapshots`

## Runs

### 2026-02-08 22:42 +0800 task bootstrap

- Command:
  - `gh issue create --title "Implement knowledge-graph-p1-visualization-extended-views" --body "..."`
  - `git fetch origin main`
  - `git worktree add -b task/308-knowledge-graph-p1-visualization-extended-views .worktrees/issue-308-knowledge-graph-p1-visualization-extended-views origin/main`
  - `rulebook task create issue-308-knowledge-graph-p1-visualization-extended-views`
  - `rulebook task validate issue-308-knowledge-graph-p1-visualization-extended-views`
- Exit code: `0`
- Key output:
  - `https://github.com/Leeky1017/CreoNow/issues/308`
  - `Preparing worktree (new branch 'task/308-knowledge-graph-p1-visualization-extended-views')`
  - `Task issue-308-knowledge-graph-p1-visualization-extended-views created successfully`
  - `Task issue-308-knowledge-graph-p1-visualization-extended-views is valid`

### 2026-02-08 23:06 +0800 Red-1（临时基线环境阻断）

- Command:
  - `git -C /home/leeky/work/CreoNow worktree add --detach /tmp/cn-issue308-red-evidence origin/main`
  - `pnpm -C /tmp/cn-issue308-red-evidence/apps/desktop test:run -- ...`
- Exit code: `1`
- Key output:
  - `sh: 1: vitest: not found`
  - `WARN Local package.json exists, but node_modules missing`
- Fix:
  - `pnpm -C /tmp/cn-issue308-red-evidence install --frozen-lockfile`

### 2026-02-08 23:06-23:07 +0800 Red-2（基线失败证据）

- Command:
  - `pnpm -C /tmp/cn-issue308-red-evidence/apps/desktop test:run -- renderer/src/features/kg/KnowledgeGraphPanel.render.test.tsx renderer/src/features/kg/KnowledgeGraphPanel.empty-state.test.tsx renderer/src/features/kg/KnowledgeGraphPanel.interaction.test.tsx renderer/src/features/kg/TimelineView.ordering.test.tsx renderer/src/features/character/CharacterCardList.test.tsx renderer/src/features/character/CharacterCardEmptyState.test.tsx renderer/src/features/kg/kg-views.stories.snapshot.test.ts`
- Exit code: `1`（预期）
- Key output:
  - `FAIL renderer/src/features/kg/KnowledgeGraphPanel.empty-state.test.tsx`
  - `Unable to find an element with the text: 暂无实体，点击添加你的第一个角色或地点`
  - `FAIL renderer/src/features/kg/KnowledgeGraphPanel.interaction.test.tsx`
  - `Unable to find an element by: [data-testid="knowledge-graph-canvas"]`
  - `Test Files 8 failed | 71 passed`
- Conclusion:
  - 旧基线（`origin/main`）无法满足 KG2 新增场景，Red 成立。

### 2026-02-08 23:07 +0800 Green（KG2 场景 + 回归测试）

- Command:
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/kg/KnowledgeGraphPanel.render.test.tsx renderer/src/features/kg/KnowledgeGraphPanel.empty-state.test.tsx renderer/src/features/kg/KnowledgeGraphPanel.interaction.test.tsx renderer/src/features/kg/TimelineView.ordering.test.tsx renderer/src/features/character/CharacterCardList.test.tsx renderer/src/features/character/CharacterCardEmptyState.test.tsx renderer/src/features/kg/kg-views.stories.snapshot.test.ts renderer/src/components/features/KnowledgeGraph/KnowledgeGraph.test.tsx renderer/src/components/layout/Sidebar.test.tsx`
- Exit code: `0`
- Key output:
  - `Test Files 9 passed (9)`
  - `Tests 75 passed (75)`

### 2026-02-08 23:08 +0800 Dependency Sync Check（依赖同步检查）

- Command:
  - `rg -n "entity|relation|capacity|threshold|error|KG_" openspec/changes/archive/knowledge-graph-p0-entity-relation-query/specs/knowledge-graph-delta.md`
  - `rg -n "knowledge:entity|knowledge:relation|knowledge:query" apps/desktop/main/src/ipc/contract/schema.ts apps/desktop/main/src/ipc/knowledgeGraph.ts packages/shared/types/ipc-generated.ts`
  - `rg -n "KG_|capacity|max|limit|timeout|subgraph|attribute" apps/desktop/main/src/services/kg -g '*.ts'`
- Exit code: `0`
- Key output:
  - 数据结构：`kg_entities` / `kg_relations` / `kg_relation_types` 契约仍与 KG-0 delta 一致。
  - IPC 契约：`knowledge:entity:*`、`knowledge:relation:*`、`knowledge:query:*` 在主进程 handler 与共享生成契约中一致存在。
  - 错误码：`KG_ENTITY_DUPLICATE`、`KG_RELATION_INVALID`、`KG_ENTITY_CONFLICT`、`KG_CAPACITY_EXCEEDED`、`KG_QUERY_TIMEOUT`、`KG_SUBGRAPH_K_EXCEEDED`、`KG_ATTRIBUTE_KEYS_EXCEEDED` 已保留。
  - 阈值：`nodeLimit`、`edgeLimit`、`attributeKeysLimit`、`queryTimeoutMs`、`pathExpansionLimit`、`subgraphMaxK` 仍由 KG service limits 管理。
- Conclusion:
  - Dependency Sync Check 结果：`PASS`（无漂移，可进入/维持 Green）。

### 2026-02-08 23:08 +0800 文档归档与顺序同步

- Command:
  - `edit openspec/changes/archive/knowledge-graph-p1-visualization-extended-views/{proposal.md,tasks.md}`
  - `edit openspec/changes/EXECUTION_ORDER.md`
  - `edit openspec/_ops/task_runs/ISSUE-308.md`
  - `edit rulebook/tasks/issue-308-knowledge-graph-p1-visualization-extended-views/tasks.md`
- Exit code: `0`
- Key output:
  - KG2 archived tasks 全量勾选。
  - `EXECUTION_ORDER.md` 活跃 change 数量更新为 `5`，并移除已归档 KG2。

### 2026-02-08 23:09 +0800 Rulebook validate 复核

- Command:
  - `rulebook task validate issue-308-knowledge-graph-p1-visualization-extended-views`
- Exit code: `0`
- Key output:
  - `Task issue-308-knowledge-graph-p1-visualization-extended-views is valid`
  - `Warnings: No spec files found (specs/*/spec.md)`

### 2026-02-08 23:09 +0800 Preflight 首次执行（预期阻断）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `PRE-FLIGHT FAILED: [RUN_LOG] PR field still placeholder ... (待回填)`
- Resolution:
  - 通过 `scripts/agent_pr_automerge_and_sync.sh` 创建 PR 并自动回填 RUN_LOG PR 链接后重跑 preflight。
