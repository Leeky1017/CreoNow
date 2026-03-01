# Proposal: issue-797-fe-spec-drift-iconbar-rightpanel-alignment
更新时间：2026-03-01 10:07

## Why
Issue #797 的核心不是“新增功能”，而是修复规范叙事与当前实现之间的认知漂移。若 D1/D2/D3 决策不统一落盘，后续任何归档或重构都可能把同一语义拆成多套口径，导致 guard 误报或漏报。

## What Changes
- 将 D1/D2/D3 的 Owner 决策统一写入变更文档：
  - D1：`media` 保留为 `[FUTURE]`，不计入当前 IconBar 入口序列。
  - D2：知识图谱语义 ID 统一为 `knowledgeGraph`，禁止 `graph` 作为最终 ID。
  - D3：RightPanel 明确为 `AI/Info/Quality` 三 tab（`ai/info/quality`）。
- 将 guard 契约说明固定到稳定路径：
  - 代码契约读取 `IconBar.tsx` 与 `layoutStore.tsx`。
  - `media [FUTURE]` 校验读取主 spec `openspec/specs/workbench/spec.md`。
  - 不依赖活跃 change 路径，避免归档后路径失效。
- 同步校对 `openspec/changes/.../tasks.md` 与 `openspec/_ops/task_runs/ISSUE-797.md`，确保叙述与当前 guard 实现一致。

## Impact
- Affected specs:
  - `openspec/changes/fe-spec-drift-iconbar-rightpanel-alignment/specs/workbench/spec.md`
  - `openspec/changes/fe-spec-drift-iconbar-rightpanel-alignment/tasks.md`
  - `openspec/_ops/task_runs/ISSUE-797.md`
- Affected code:
  - `apps/desktop/renderer/src/components/layout/__tests__/panel-id-ssot.guard.test.ts`
  - `rulebook/tasks/issue-797-fe-spec-drift-iconbar-rightpanel-alignment/proposal.md`
  - `rulebook/tasks/issue-797-fe-spec-drift-iconbar-rightpanel-alignment/tasks.md`
- Breaking change: NO
- User benefit: 规范、守卫与运行记录形成单一事实源（SSOT），后续 archive/apply 阶段不再受临时路径耦合影响。
