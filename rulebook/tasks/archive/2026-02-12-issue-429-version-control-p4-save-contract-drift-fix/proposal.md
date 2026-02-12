# Proposal: issue-429-version-control-p4-save-contract-drift-fix

## Why

`file:document:save` 的 IPC 响应契约缺失 `compaction` 可选字段，导致 runtime validation 拒绝实际响应并引发 autosave/save 相关 E2E 失败。必须补齐契约以恢复保存链路稳定性。

## What Changes

- 更新 `file:document:save` response schema，加入可选 `compaction`
- 更新生成类型 `packages/shared/types/ipc-generated.ts`
- 补充契约回归测试断言

## Impact

- Affected specs: `openspec/specs/ipc/spec.md`, `openspec/specs/version-control/spec.md`
- Affected code: `apps/desktop/main/src/ipc/contract/ipc-contract.ts`, `apps/desktop/tests/unit/document-ipc-contract.test.ts`, `packages/shared/types/ipc-generated.ts`
- Breaking change: NO
- User benefit: 保存链路不再因 schema 漂移进入 error 状态
