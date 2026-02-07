# Proposal: issue-244-ipc-p0-contract-ssot-and-codegen

## Why

将 IPC 契约从“存在代码生成”升级为“可验证的 SSOT + 阻断绕过 + 稳定错误码”，确保契约漂移、非法命名、缺失 schema、未注册绑定等问题在本地与 CI 都能被一致阻断，避免把协议不一致带到后续 change。

## What Changes

- 增强 `scripts/contract-generate.ts`：加入契约校验与稳定错误码输出。
- 新增契约校验测试：覆盖 deterministic、缺失 schema、重复通道、非法命名、未注册 IPC 绑定。
- 保持 `pnpm contract:check` 作为 CI 漂移门禁，补齐与本 change 的证据链。
- 更新 OpenSpec change tasks 与 RUN_LOG，记录 Red/Green/Refactor 证据。

## Impact

- Affected specs:
  - `openspec/changes/ipc-p0-contract-ssot-and-codegen/specs/ipc/spec.md`
  - `openspec/changes/ipc-p0-contract-ssot-and-codegen/tasks.md`
- Affected code:
  - `scripts/contract-generate.ts`
  - `apps/desktop/tests/unit/contract-generate.spec.ts`
  - `apps/desktop/tests/unit/contract-generate.validation.spec.ts`
  - `package.json`
- Breaking change: NO
- User benefit: IPC 契约错误更早被阻断，生成产物保持稳定，减少跨进程协议漂移故障。
