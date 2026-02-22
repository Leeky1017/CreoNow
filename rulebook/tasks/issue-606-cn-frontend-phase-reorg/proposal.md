# Proposal: issue-606-cn-frontend-phase-reorg

更新时间：2026-02-22 11:43

## Why

Notion 页面“CN 前端开发”已沉淀 14 个子页面内容，但当前交付目标不是按子页面数量拆分 change，而是按 Phase 路线（止血/拆弹/提质/精磨）重组为可执行的 OpenSpec 变更集合。若继续按页面维度组织，会造成执行顺序不清、依赖关系模糊、治理门禁难以对齐。

## What Changes

- 创建 4 个以 Phase 为主线的活跃 OpenSpec changes：
  - `issue-606-phase-1-stop-bleeding`
  - `issue-606-phase-2-shell-decomposition`
  - `issue-606-phase-3-quality-uplift`
  - `issue-606-phase-4-polish-and-delivery`
- 每个 change 均补齐 `proposal.md`、`tasks.md`、`specs/*/spec.md`，并在 `tasks.md` 中使用固定 TDD 章节顺序。
- 更新 `openspec/changes/EXECUTION_ORDER.md`，写明 Phase 依赖链与并行/串行策略。
- 记录 ISSUE-606 RUN_LOG，保存命令证据与主会话审计结论。

## Impact

- Affected specs:
  - `openspec/changes/issue-606-phase-1-stop-bleeding/**`
  - `openspec/changes/issue-606-phase-2-shell-decomposition/**`
  - `openspec/changes/issue-606-phase-3-quality-uplift/**`
  - `openspec/changes/issue-606-phase-4-polish-and-delivery/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code: 文档与治理文件（无运行时代码变更）
- Breaking change: NO
- User benefit: 前端治理路线从“页面堆叠”变为“阶段驱动”，可直接按依赖推进执行与验收。
