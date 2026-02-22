# Active Changes Execution Order

更新时间：2026-02-22 17:24

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **3**。
- 执行模式：**混合模式（文档重组并行、实现落地串行）**。
- 规则：
  - issue-606 的四个 Phase change 在“文档重组阶段”可并行起草（已完成）。
  - Phase 1 已归档后，后续实现阶段按依赖执行：Phase 2 -> Phase 3 -> Phase 4。
  - 任一 Phase 开始 Red 前，必须完成该 Phase 的依赖同步检查（Dependency Sync Check）。

## 执行顺序

1. `issue-606-phase-2-shell-decomposition`

- Phase 2 拆弹：AppShell 三拆（LayoutShell/NavigationController/PanelOrchestrator）+ IPC 入口收敛。
- 依赖：`issue-606-phase-1-stop-bleeding`。

2. `issue-606-phase-3-quality-uplift`

- Phase 3 提质：ScrollArea 统一、motion token 契约、Typography 与 a11y/test 策略。
- 依赖：`issue-606-phase-1-stop-bleeding`、`issue-606-phase-2-shell-decomposition`。

3. `issue-606-phase-4-polish-and-delivery`

- Phase 4 精磨：视觉审计闭环、参考对标、交付物治理、CI/CD 与 i18n 渐进策略。
- 依赖：`issue-606-phase-1-stop-bleeding`、`issue-606-phase-2-shell-decomposition`、`issue-606-phase-3-quality-uplift`。

## 依赖说明

- `issue-606-phase-1-stop-bleeding`：已归档至 `openspec/changes/archive/issue-606-phase-1-stop-bleeding`，作为后续阶段基线。
- `issue-606-phase-2-shell-decomposition`：依赖 Phase 1（已归档）输出的视觉/组件治理基线。
- `issue-606-phase-3-quality-uplift`：依赖 Phase 1+2 输出的壳层边界与样式治理基线。
- `issue-606-phase-4-polish-and-delivery`：依赖 Phase 1+2+3 的稳定实现基线与验证资产。

## 波次并行建议

- 文档波次（已完成）：Phase 1~4 并行重组。
- 实施波次（后续）：
  - Wave A：Phase 1（已完成并归档）
  - Wave B：Phase 2
  - Wave C：Phase 3
  - Wave D：Phase 4

## 进度快照

- ISSUE-604 当前状态：已归档至 `openspec/changes/archive/issue-604-windows-frameless-titlebar`，并从活跃执行顺序移除。
- ISSUE-606 当前状态：Phase 1 已完成并归档；活跃阶段剩余 Phase 2/3/4。
- ISSUE-613 当前状态：PR `#614` 已合并，Issue 已关闭，Rulebook task 已归档。
- 本次提交完成 Phase 1 收口归档与执行顺序同步，不包含 Phase 2/3/4 范围实现。
- ISSUE-608 当前状态：已修复 ISSUE-606 文档中的治理收口漂移、i18n 门禁语义冲突与 Scenario 映射缺口。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 任一 Phase 依赖关系变化时，必须同步更新“执行顺序/依赖说明/进度快照”。
- 未同步本文件时，不得宣称多变更执行顺序已确认。
