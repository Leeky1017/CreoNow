# Proposal: issue-359-context-engine-p1-token-budget-truncation

## Why
`openspec/changes/context-engine-p1-token-budget-truncation` 已进入 Phase A，但代码层仍停留在 CE-1：目前缺少固定预算比例/最小保障、固定裁剪顺序，以及 `context:budget:get/update` 契约，导致 Context Engine 在超预算输入下缺乏确定性行为，且下游 CE P2/P3 无法依赖可审计预算配置。

## What Changes
- 基于 CE2 delta spec 实现 Token 预算管理最小闭环：
  - 固化预算比例与最小保障（`15/10/25/50` + `500/200/0/2000`）。
  - 固化裁剪顺序 `Retrieved -> Settings -> Immediate`，Rules 不进入通用裁剪链路。
  - 在 Context Assembly 中引入预算 profile 与 tokenizer 元数据一致性边界。
- 新增并落地预算 IPC：
  - `context:budget:get`
  - `context:budget:update`（乐观锁 `version` + tokenizer 元数据校验）
- 以 TDD 执行 CE2-R1-S1~S3：
  - 先写失败测试（Red）并记录证据；
  - 实现最小通过（Green）；
  - 重构预算校验与错误码映射（Refactor）。
- 更新 IPC contract schema + codegen，并完成 preflight/门禁验证、PR 自动合并与主干收口。

## Impact
- Affected specs:
  - `openspec/changes/context-engine-p1-token-budget-truncation/specs/context-engine-delta.md`
  - `openspec/changes/context-engine-p1-token-budget-truncation/tasks.md`
  - `rulebook/tasks/issue-359-context-engine-p1-token-budget-truncation/specs/context-engine/spec.md`
- Affected code:
  - `apps/desktop/main/src/services/context/layerAssemblyService.ts`
  - `apps/desktop/main/src/ipc/context.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/unit/context/token-budget-within-limit.test.ts`
  - `apps/desktop/tests/unit/context/token-budget-truncation-order.test.ts`
  - `apps/desktop/tests/unit/context/token-budget-update-conflict.test.ts`
- Breaking change: NO
- User benefit: Context Engine 在预算边界下输出可预测、可配置、可审计，为 CE 后续 change 提供稳定前提。
