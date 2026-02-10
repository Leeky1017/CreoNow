# Proposal: issue-366-context-engine-p2-stable-prefix-hash

## Why

`openspec/changes/context-engine-p2-stable-prefix-hash` 已进入 Phase A，但主进程 Context Engine 仍仅对 `rules + settings` 做字符串拼接哈希，且 `stablePrefixUnchanged` 仍按 `project+document+skill` 维度判定，未满足 CE-3 对 canonicalize、非确定字段剔除、以及 `project+skill+provider+model+tokenizerVersion` 命中语义的要求，导致 prompt caching 命中行为不可审计。

## What Changes

- 按 CE-3 实现 Stable Prefix Hash canonicalize 规则：
  - 仅对 `Rules + Settings` 参与哈希；
  - 对 JSON payload 执行稳定键排序；
  - 对 `constraints` 列表按 `priority desc`、`id asc` 排序；
  - 剔除非确定字段：`timestamp`、`requestId`、`nonce`；
  - 统一使用 SHA-256 输出 `stablePrefixHash`。
- 按 CE-3 收敛 `stablePrefixUnchanged` 语义：
  - 命中 key 使用 `projectId + skillId + provider + model + tokenizerVersion`；
  - 维度切换（provider/model/tokenizerVersion）触发失效。
- 以 TDD 交付 CE3-R1-S1 / CE3-R1-S2：
  - 新增 `stable-prefix-hash-hit.test.ts`
  - 新增 `stable-prefix-hash-invalidation.test.ts`
- 对齐 IPC contract schema + generated types，保证 `context:prompt:assemble|inspect` 请求可携带 provider/model/tokenizerVersion。

## Impact

- Affected specs:
  - `openspec/changes/context-engine-p2-stable-prefix-hash/specs/context-engine-delta.md`
  - `openspec/changes/context-engine-p2-stable-prefix-hash/tasks.md`
  - `rulebook/tasks/issue-366-context-engine-p2-stable-prefix-hash/specs/context-engine/spec.md`
- Affected code:
  - `apps/desktop/main/src/services/context/layerAssemblyService.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/unit/context/stable-prefix-hash-hit.test.ts`
  - `apps/desktop/tests/unit/context/stable-prefix-hash-invalidation.test.ts`
- Breaking change: NO
- User benefit: Stable Prefix 命中/失效可预测，避免非确定字段导致缓存抖动，降低重复 prompt 计算成本并提升响应稳定性。
