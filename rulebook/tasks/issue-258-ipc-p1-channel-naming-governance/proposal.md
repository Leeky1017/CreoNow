# Proposal: issue-258-ipc-p1-channel-naming-governance

## Why

`ipc-p1-channel-naming-governance` 需要从“仅格式检查”升级为“白名单 + 三段式强约束 + 冲突阻断”，否则历史两段式/多段式命名会持续扩散并增加后续 IPC 迁移成本。

## What Changes

- 新增命名治理单测（S1~S4），先 Red 后 Green。
- 在 `scripts/contract-generate.ts` 增加：
  - `domain` 白名单校验
  - `<domain>:<resource>:<action>` 三段式强校验
  - `IPC_CONTRACT_UNKNOWN_DOMAIN` 与 `IPC_CONTRACT_NAME_COLLISION` 错误码
  - preload method 名冲突检测与可定位错误详情
- 迁移现有 IPC channel 命名到三段式并更新调用点。
- 记录 RUN_LOG 证据并完成自动合并收口到 `main`。

## Impact

- Affected specs:
  - `openspec/changes/ipc-p1-channel-naming-governance/specs/ipc/spec.md`
  - `openspec/changes/ipc-p1-channel-naming-governance/tasks.md`
- Affected code:
  - `scripts/contract-generate.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/main/src/ipc/**/*.ts`
  - `apps/desktop/renderer/src/**/*.ts*`
  - `apps/desktop/tests/**/*.ts`
- Breaking change: YES（IPC channel string 统一迁移为三段式）
- User benefit: 命名规则稳定可执行，CI 可在生成阶段阻断违规定义并提供可定位错误信息。
