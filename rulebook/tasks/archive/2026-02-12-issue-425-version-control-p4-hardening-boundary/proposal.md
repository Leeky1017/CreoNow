# Proposal: issue-425-version-control-p4-hardening-boundary

## Why

`version-control-p4-hardening-boundary` 是 Version Control 泳道的生产验收层。若缺失并发互斥、容量压缩、超大 Diff 保护与重试策略，p0~p3 已交付功能在高负载或异常场景会出现不可控退化，无法满足主 spec 的边界要求。

## What Changes

- 增加 Version IPC 侧 document 级串行锁与回滚冲突检测（`VERSION_ROLLBACK_CONFLICT`）。
- 增加 IO 失败重试框架（最多 3 次、单次 5s 超时）并用于关键 version 操作。
- 增加快照容量压缩策略（超限时压缩 7 天前 `autosave`，返回 `VERSION_SNAPSHOT_COMPACTED` 事件信息）。
- 增加 Diff 输入大小保护（2MB 上限，超限返回 `VERSION_DIFF_PAYLOAD_TOO_LARGE`）。
- 更新 IPC contract 错误码与 `version:snapshot:create` 响应 schema。
- 新增 P4 专项单测并补齐既有 contract/lifecycle 测试兼容。

## Impact

- Affected specs:
  - `openspec/changes/version-control-p4-hardening-boundary/**`
  - `openspec/specs/version-control/spec.md`（仅消费，不直接修改）
- Affected code:
  - `apps/desktop/main/src/ipc/version.ts`
  - `apps/desktop/main/src/services/documents/documentService.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/unit/version-hardening-boundary.ipc.test.ts`
  - `apps/desktop/tests/unit/document-ipc-contract.test.ts`
  - `apps/desktop/tests/unit/documentService.lifecycle.test.ts`
- Breaking change: NO
- User benefit: 版本系统在并发、容量与异常场景下具备可预期失败与恢复路径，降低写作中断和数据风险。
