# Proposal: issue-381-context-engine-p4-hardening-boundary

## Why

`openspec/changes/context-engine-p4-hardening-boundary` 已定义 CE5 的边界硬化需求，但当前代码缺少 inspect 调试门禁、输入上限硬保护、同文档并发背压、跨项目注入阻断与日志脱敏约束。若不补齐，Context Engine 在高并发和异常输入下会出现不可判定失败或安全边界漂移，无法满足 CE5 可验收标准。

## What Changes

- 交付 CE5 六个场景对应测试（2 integration + 4 unit），并执行 Red→Green→Refactor。
- 在 Context IPC 增加边界硬化链路：
  - `context:prompt:inspect` 强制 `debugMode=true` 且 `callerRole in {owner, maintainer}`，否则返回 `CONTEXT_INSPECT_FORBIDDEN`。
  - 组装输入超过 64k token 返回 `CONTEXT_INPUT_TOO_LARGE`，包含缩减建议。
  - 同 `projectId + documentId` 并发超过 4 返回 `CONTEXT_BACKPRESSURE`。
- 在 Context Assembly Service 增加跨项目 chunk 注入阻断：`CONTEXT_SCOPE_VIOLATION`。
- 扩展 IPC contract 错误码并更新 codegen：新增 `CONTEXT_INSPECT_FORBIDDEN`、`CONTEXT_INPUT_TOO_LARGE`、`CONTEXT_BACKPRESSURE`。
- 完成 OpenSpec change 勾选、归档和 `EXECUTION_ORDER.md` 同步。

## Impact

- Affected specs:
  - `openspec/changes/context-engine-p4-hardening-boundary/proposal.md`
  - `openspec/changes/context-engine-p4-hardening-boundary/specs/context-engine-delta.md`
  - `openspec/changes/context-engine-p4-hardening-boundary/tasks.md`
- Affected code:
  - `apps/desktop/main/src/ipc/context.ts`
  - `apps/desktop/main/src/services/context/layerAssemblyService.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/unit/context/context-inspect-permission.test.ts`
  - `apps/desktop/tests/unit/context/context-budget-update-conflict.test.ts`
  - `apps/desktop/tests/unit/context/context-scope-violation.test.ts`
  - `apps/desktop/tests/unit/context/context-input-too-large.test.ts`
  - `apps/desktop/tests/integration/context/context-slo-thresholds.test.ts`
  - `apps/desktop/tests/integration/context/context-backpressure-redaction.test.ts`
- Breaking change: NO（沿用 `context:prompt:assemble` / `context:prompt:inspect` 通道，仅增强校验）
- User benefit: Context 组装在权限、容量、并发和安全边界下具备可判定错误码与可审计行为，避免 silent failure。
