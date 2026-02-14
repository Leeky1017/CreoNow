# Proposal: issue-548-s2-wave4-governed-delivery

## Why

Sprint 2 Wave4 仍有 4 个活跃 change 未交付（`s2-slash-commands`、`s2-inline-diff`、`s2-test-timing-fix`、`s2-story-assertions`）。需要在同一治理闭环内完成并行实施、主会话审计、门禁验证与主干收口，避免后续 Wave5/Wave6 在未稳定基线上继续堆叠风险。

## What Changes

- 以多子代理并行方式执行 Wave4 四个 change，并将结果集成到 `task/548-s2-wave4-governed-delivery`。
- 对子代理实现进行主会话审计，修正与路线图/规格不一致的实现偏差（含 inline diff 文件契约修正）。
- 完成 Wave4 相关测试复验与全量门禁验证。
- 归档 Wave4 四个完成 change，更新 `openspec/changes/EXECUTION_ORDER.md`，并完成 RUN_LOG + Rulebook + GitHub 合并闭环。

## Impact

- Affected specs:
  - `openspec/changes/s2-slash-commands/**`
  - `openspec/changes/s2-inline-diff/**`
  - `openspec/changes/s2-test-timing-fix/**`
  - `openspec/changes/s2-story-assertions/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `apps/desktop/renderer/src/features/editor/**`
  - `apps/desktop/renderer/src/features/ai/AiPanel.stories.test.ts`
  - `apps/desktop/main/src/services/**/__tests__/**`
  - `apps/desktop/tests/{integration,unit}/**`
- Breaking change: NO
- User benefit:
  - Slash 写作命令可用性增强
  - Inline diff 接受/拒绝控制能力落地
  - 测试异步等待稳定性提升，降低 flaky
  - Story 断言质量提升，减少伪绿
