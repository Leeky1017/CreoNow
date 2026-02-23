# Active Changes Execution Order

更新时间：2026-02-23 20:02

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **2**。
- 执行模式：**串行实现（依赖顺序执行）**。
- 规则：
  - `issue-606-phase-2-shell-decomposition` 已在当前交付分支完成并归档到 `openspec/changes/archive/issue-606-phase-2-shell-decomposition`。
  - 后续实现阶段按依赖执行：Phase 3 -> Phase 4。
  - 任一 Phase 开始 Red 前，必须完成该 Phase 的依赖同步检查（Dependency Sync Check）。

## 执行顺序

1. `issue-606-phase-3-quality-uplift`

- Phase 3 提质：ScrollArea 统一、motion token 契约、Typography 与 a11y/test 策略。
- 依赖：`issue-606-phase-1-stop-bleeding`、`issue-606-phase-2-shell-decomposition`（已归档）。

2. `issue-606-phase-4-polish-and-delivery`

- Phase 4 精磨：视觉审计闭环、参考对标、交付物治理、CI/CD 与 i18n 渐进策略。
- 依赖：`issue-606-phase-1-stop-bleeding`、`issue-606-phase-2-shell-decomposition`（已归档）、`issue-606-phase-3-quality-uplift`。

## 依赖说明

- `issue-606-phase-1-stop-bleeding`：已归档至 `openspec/changes/archive/issue-606-phase-1-stop-bleeding`，作为后续阶段基线。
- `issue-606-phase-2-shell-decomposition`：已归档至 `openspec/changes/archive/issue-606-phase-2-shell-decomposition`，提供壳层边界与 IPC 收敛基线。
- `issue-606-phase-3-quality-uplift`：依赖 Phase 1+2 的稳定壳层/样式治理基线。
- `issue-606-phase-4-polish-and-delivery`：依赖 Phase 1+2+3 的稳定实现基线与验证资产。

## 波次并行建议

- 文档波次（已完成）：Phase 1~4 并行重组。
- 实施波次（后续）：
  - Wave C：Phase 3
  - Wave D：Phase 4

## 进度快照

- ISSUE-616 当前状态：Phase 2 范围代码与治理文档已在当前分支完成，待 PR 合并后生效。
- ISSUE-606 当前状态：Phase 1、Phase 2 已归档；活跃阶段剩余 Phase 3/4。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 任一 Phase 依赖关系变化时，必须同步更新“执行顺序/依赖说明/进度快照”。
- 未同步本文件时，不得宣称多变更执行顺序已确认。
