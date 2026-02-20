# 提案：aud-m2-shared-token-budget-helper

## Why（问题与目标）

Token 预算估算与截断若在 main/renderer/rag 等多个层分别实现私有 helper，会导致：

- 估算口径漂移（同一文本在不同层估算 token 不一致）。
- 截断行为不可预测，影响上下文组装与 RAG 结果稳定性。

本 change 的目标是将 token 估算/截断能力收敛到共享模块（`@shared/tokenBudget`），并用最小静态测试证明关键调用点不再定义私有估算器。

## What（交付内容）

- main/renderer/rag 的 token 估算与截断必须导入并使用 `@shared/tokenBudget`。
- 禁止在这些关键路径内再定义私有 `estimateTokenCount/estimateTokens` 函数。
- 新增回归测试：`apps/desktop/tests/unit/context/token-budget-shared-helper.test.ts`
  - 覆盖 Scenario `CE-AUD-M2-S1`（对应注释 S1）。

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-m2-shared-token-budget-helper/specs/context-engine/spec.md`
- Tests（evidence）:
  - `apps/desktop/tests/unit/context/token-budget-shared-helper.test.ts`

## Out of Scope（不做什么）

- 不在本 change 内更换 token 估算算法（仅收敛实现位置与引用路径）。
- 不在本 change 内调整预算阈值（阈值属于上层策略配置）。

## Evidence（可追溯证据）

- Wave0 RUN_LOG：`openspec/_ops/task_runs/ISSUE-589.md`
- Wave0 PR：https://github.com/Leeky1017/CreoNow/pull/590

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
