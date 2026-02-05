# Proposal: issue-218-mvp-readiness-remediation

## Why

MVP 审评报告指出：当前 CN 就绪度约 85%，且存在 1 个 P0 阻塞（Dashboard 项目操作入口未接电）与多项 P0/P1/P2 短板（Preview/Restore 确认、ErrorBoundary、CI 组件测试、安全与性能债）。如果仅停留在“报告结论”，执行阶段容易出现：范围漂移、验收口径不一致、并行冲突导致返工，从而直接影响 MVP 交付成败。

## What Changes

本任务是 **Spec-first 的执行化交付**：不修改运行时代码，只在 `openspec/specs/` 下新增一份完整 OpenSpec（spec + design + task cards），把审评报告 todos 深化为“执行者拿到就能立刻开工”的任务卡（写死触碰文件、验收标准、测试与边界场景、并行冲突约束）。

## Impact

- Affected specs:
  - `openspec/specs/creonow-mvp-readiness-remediation/spec.md`
  - `openspec/specs/creonow-mvp-readiness-remediation/design/*.md`
  - `openspec/specs/creonow-mvp-readiness-remediation/task_cards/**/*.md`
- Affected code: NO（本任务不修改 app 运行时逻辑）
- Breaking change: NO
- User benefit:
  - 把“审评报告”转化为“可落地施工图”：执行不靠脑补，验收与测试口径一致，并行冲突可控，缩短闭环时间与返工成本。
